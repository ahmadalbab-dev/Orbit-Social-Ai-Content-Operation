import { describe, expect, it } from "vitest";
import { webOrigin, trustedProxyIps } from "./http-config";
describe("backend CORS origin configuration", () => {
  it("requires explicit production configuration", () => {
    expect(() => webOrigin({ NODE_ENV: "production" })).toThrow(
      "must be configured",
    );
  });
  it.each([
    "*",
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com/app",
    "https://example.com?next=other",
    "https://localhost:3000",
  ])("rejects unsafe production CORS destination %s", (url) => {
    expect(() => webOrigin({ NODE_ENV: "production", WEB_URL: url })).toThrow();
  });
  it("normalizes a single HTTPS origin", () => {
    expect(
      webOrigin({
        NODE_ENV: "production",
        WEB_URL: "https://orbit-ai-studio-two.vercel.app/",
      }),
    ).toBe("https://orbit-ai-studio-two.vercel.app");
  });
  it("retains local development only outside production", () => {
    expect(webOrigin({ NODE_ENV: "test" })).toBe("http://localhost:3000");
  });
});

describe("trusted proxy addresses", () => {
  it("ignores forwarded IPs by default", () => {
    expect(trustedProxyIps({})).toEqual([]);
  });
  it("allows explicitly selected IPv4 and IPv6 proxy addresses", () => {
    expect(trustedProxyIps({ TRUSTED_PROXY_IPS: "127.0.0.1, ::1" })).toEqual([
      "127.0.0.1",
      "::1",
    ]);
  });
  it.each(["true", "*", "1", "10.0.0.0/8", "example.com", "127.0.0.1,"])(
    "rejects blanket or ambiguous proxy trust %s",
    (value) => {
      expect(() => trustedProxyIps({ TRUSTED_PROXY_IPS: value })).toThrow(
        "explicit proxy IP",
      );
    },
  );
});
