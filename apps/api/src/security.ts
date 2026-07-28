import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify } from "jose";

export type RequestIdentity = { sub: string; workspaceId: string };
@Injectable()
export class TenantAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; identity?: RequestIdentity }>();
    const workspaceId = request.headers["x-workspace-id"];
    if (!workspaceId) throw new UnauthorizedException("Workspace header required");
    if (process.env.NODE_ENV !== "production" && !process.env.SUPABASE_JWT_SECRET) {
      request.identity = { sub: "local-developer", workspaceId }; return true;
    }
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token || !process.env.SUPABASE_JWT_SECRET) throw new UnauthorizedException();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET), { algorithms: ["HS256"] });
    if (!payload.sub) throw new UnauthorizedException();
    request.identity = { sub: payload.sub, workspaceId };
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
