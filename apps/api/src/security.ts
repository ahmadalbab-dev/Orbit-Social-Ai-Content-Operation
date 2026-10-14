import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { jwtVerify } from "jose";

export type RequestIdentity = { sub: string; workspaceId: string; role: string };
@Injectable()
export class TenantAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; identity?: RequestIdentity }>();
    const handler = context.getHandler();
    if (["health", "ready"].includes(handler.name)) return true;
    const workspaceId = request.headers["x-workspace-id"];
    if (typeof workspaceId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(workspaceId)) throw new UnauthorizedException("Valid workspace header required");
    if (process.env.NODE_ENV !== "production" && process.env.AUTH_MODE === "local-demo") {
      request.identity = { sub: "local-developer", workspaceId, role: "owner" }; return true;
    }
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token || !process.env.SUPABASE_JWT_SECRET || !process.env.SUPABASE_JWT_ISSUER || !process.env.SUPABASE_JWT_AUDIENCE) throw new UnauthorizedException("JWT verification configuration and bearer token required");
    let payload;
    try { ({ payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET), { algorithms: ["HS256"], issuer: process.env.SUPABASE_JWT_ISSUER, audience: process.env.SUPABASE_JWT_AUDIENCE })); }
    catch { throw new UnauthorizedException("Invalid token"); }
    if (!payload.sub || typeof payload.exp !== "number") throw new UnauthorizedException("Subject and expiry required");
    const metadata = payload.app_metadata as { workspace_ids?: unknown; workspace_role?: unknown } | undefined;
    if (!Array.isArray(metadata?.workspace_ids) || !metadata.workspace_ids.includes(workspaceId)) throw new ForbiddenException("Workspace access denied");
    const role = typeof metadata.workspace_role === "string" ? metadata.workspace_role.toLowerCase() : "viewer";
    const isApproval = handler.name === "approve";
    const method = (context.switchToHttp().getRequest() as { method?: string }).method;
    if (isApproval && !["owner", "admin", "approver"].includes(role)) throw new ForbiddenException("Approval role required");
    if (!isApproval && !["GET", "HEAD"].includes(method ?? "") && !["owner", "admin", "editor"].includes(role)) throw new ForbiddenException("Editing role required");
    request.identity = { sub: payload.sub, workspaceId, role };
    return true;
  }
}
export class TokenVault {
  private key: Buffer;
  constructor(encodedKey: string) {
    this.key = Buffer.from(encodedKey, "base64");
    if (this.key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes in base64");
  }
  encrypt(value: string) {
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
  }
  decrypt(value: string) {
    const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
}
