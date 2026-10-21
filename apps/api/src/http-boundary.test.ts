import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AppModule } from "./app.module";
import { DatabaseService } from "./database.service";
import { TenantAuthGuard } from "./security";
import { trustedProxyIps } from "./http-config";

describe("HTTP abuse boundary", () => {
  it("rate-limits failed authentication before repeating identity work", async () => {
    const identity = vi
      .spyOn(TenantAuthGuard.prototype, "canActivate")
      .mockRejectedValue(new UnauthorizedException("Invalid identity"));
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, "127.0.0.1");
      const url = await app.getUrl();
      for (let i = 0; i < 60; i++)
        expect((await fetch(`${url}/content`)).status).toBe(401);
      expect((await fetch(`${url}/content`)).status).toBe(429);
      expect(identity).toHaveBeenCalledTimes(60);
    } finally {
      await app.close();
      identity.mockRestore();
    }
  }, 20000);
});

describe("forwarded client IP boundary", () => {
  it.each([
    { proxies: "192.0.2.1", expected: "127.0.0.1" },
    { proxies: "127.0.0.1", expected: "203.0.113.7" },
  ])(
    "ignores attacker-supplied leftmost IP with proxy config $proxies",
    async ({ proxies, expected }) => {
      const identity = vi
        .spyOn(TenantAuthGuard.prototype, "canActivate")
        .mockRejectedValue(new UnauthorizedException("Invalid identity"));
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DatabaseService)
        .useValue({})
        .compile();
      const app = module.createNestApplication({ logger: false });
      let observed = "";
      app
        .getHttpAdapter()
        .getInstance()
        .set("trust proxy", trustedProxyIps({ TRUSTED_PROXY_IPS: proxies }));
      app.use((req: { ip: string }, _res: unknown, next: () => void) => {
        observed = req.ip;
        next();
      });
      try {
        await app.listen(0, "127.0.0.1");
        const response = await fetch(`${await app.getUrl()}/content`, {
          headers: { "X-Forwarded-For": "198.51.100.99, 203.0.113.7" },
        });
        expect(response.status).toBe(401);
        expect(observed).toBe(expected);
      } finally {
        await app.close();
        identity.mockRestore();
      }
    },
  );
});
