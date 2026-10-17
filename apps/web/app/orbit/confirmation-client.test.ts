import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmEmailRedirect } from "./confirmation-client";
const config = { url: "https://auth.orbit.test", key: "sb_publishable_fixture" };
afterEach(() => vi.unstubAllGlobals());
describe("email confirmation", () => {
  it("checks the provider identity, then discards only the link session", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ email_confirmed_at: "2026-10-17T00:00:00Z" })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await confirmEmailRedirect("#type=signup&access_token=fixture-token", config)).toContain("Email confirmed. Sign in");
    expect(fetcher.mock.calls[0][0]).toBe(`${config.url}/auth/v1/user`);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer fixture-token");
    expect(fetcher.mock.calls[1][0]).toBe(`${config.url}/auth/v1/logout?scope=local`);
  });
  it("does not trust a success fragment without confirmed provider identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "private details" }, { status: 401 })));
    const message = await confirmEmailRedirect("#type=signup&access_token=invalid", config);
    expect(message).toContain("couldn't verify");
    expect(message).not.toContain("private details");
  });
  it("explains a reused link without reflecting provider text or making a request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await confirmEmailRedirect("#error=access_denied&error_code=otp_expired&error_description=private", config)).toContain("already used");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("ignores unrelated hashes and sends no credentials to a fragment-provided URL", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await confirmEmailRedirect("#next=https://evil.test", config)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
