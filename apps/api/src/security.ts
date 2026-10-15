import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DatabaseService } from "./database.service";
import { jwtVerify, createRemoteJWKSet } from "jose";

const trustedKeySets = new Map<string,ReturnType<typeof createRemoteJWKSet>>();

export type RequestIdentity = { sub: string; email?: string; workspaceId: string; userId: string; role: string };
export const Public = () => SetMetadata("orbit.public", true);
export const IdentityOnly = () => SetMetadata("orbit.identityOnly", true);

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride("orbit.public", [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; identity?: RequestIdentity }>();
    let sub: string; let email: string | undefined;
    if (process.env.DEV_AUTH_ENABLED === "true" && process.env.NODE_ENV !== "production") {
      sub = "local-developer"; email = "developer@localhost.invalid";
    } else {
      const token = request.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
      const secret = process.env.AUTH_JWT_SECRET;
      const issuer = process.env.AUTH_JWT_ISSUER;
      const audience = process.env.AUTH_JWT_AUDIENCE;
      if (!token || !issuer || !audience || (!process.env.AUTH_JWKS_URL && (!secret || secret.length < 32))) throw new UnauthorizedException("Verified identity is required");
      try {
        const jwksUrl = process.env.AUTH_JWKS_URL;
        let key: Uint8Array | ReturnType<typeof createRemoteJWKSet>;
        if(jwksUrl){
          const url=new URL(jwksUrl);
          if(url.protocol!=="https:" || url.username || url.password || url.hash)throw new Error("Invalid trusted JWKS endpoint");
          if(!trustedKeySets.has(jwksUrl))trustedKeySets.set(jwksUrl,createRemoteJWKSet(url,{timeoutDuration:5000}));
          key=trustedKeySets.get(jwksUrl)!;
        }else key=new TextEncoder().encode(secret!);
        const { payload } = await jwtVerify(token, key as ReturnType<typeof createRemoteJWKSet>, { algorithms: jwksUrl?["ES256","RS256"]:["HS256"], issuer, audience, requiredClaims: ["sub", "exp", "iat"] });
        if (!payload.sub) throw new Error("Missing subject");
        sub = payload.sub;
        email = typeof payload.email === "string" ? payload.email : undefined;
      } catch { throw new UnauthorizedException("Invalid or expired identity"); }
    }
    const user = await this.db.user.findUnique({ where: { authUserId: sub } });
    if (this.reflector.getAllAndOverride("orbit.identityOnly", [context.getHandler(), context.getClass()])) {
      request.identity = { sub, email, userId: user?.id ?? "", workspaceId: "", role: "" }; return true;
    }
    const workspaceId = request.headers["x-workspace-id"];
    if (!workspaceId || workspaceId.length > 100 || !user) throw new ForbiddenException("Workspace access denied");
    const membership = await this.db.membership.findFirst({ where: { userId: user.id, workspaceId } });
    if (!membership) throw new ForbiddenException("Workspace access denied");
    request.identity = { sub, email, userId: user.id, workspaceId, role: membership.role };
    return true;
  }
}
export class TokenVault {
  private key: Buffer;
  constructor(encodedKey: string) {
    this.key = Buffer.from(encodedKey, "base64");
    if (this.key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes in base64");
  }
  encrypt(value: string, context: string) {
    if(!context)throw new Error("Token context is required");
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
  }
  decrypt(value: string, context: string) {
    if(!context)throw new Error("Token context is required");
    const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv); decipher.setAuthTag(tag); decipher.setAAD(Buffer.from(context));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
}
