import { afterEach, describe, expect, it, vi } from "vitest";
import { requestRecovery, resetRecoveredPassword } from "./recovery-client";
import { refreshAuth } from "./auth-client";
const config = {
  url: "https://orbit-test.supabase.co",
  key: "sb_publishable_fixture",
};
afterEach(() => vi.unstubAllGlobals());
describe("identity provider boundaries", () => {
  it("refreshes by POST body and requires the rotated token pair", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          access_token: "next",
          refresh_token: "rotated",
          expires_in: 3600,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await refreshAuth("old", config)).toEqual({
      access_token: "next",
      refresh_token: "rotated",
      expires_in: 3600,
    });
    expect(fetcher.mock.calls[0][0]).toBe(
      `${config.url}/auth/v1/token?grant_type=refresh_token`,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      refresh_token: "old",
    });
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
  });
  it("does not reflect provider refresh errors or accept incomplete sessions", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            message: "sensitive",
            access_token: "next",
            expires_in: 3600,
          }),
        ),
    );
    await expect(refreshAuth("old", config)).rejects.toThrow(
      "Cannot renew your session. Sign in again.",
    );
  });
  it("requests recovery without reporting whether an account exists", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetcher);
    await requestRecovery("person@example.com", config);
    expect(fetcher.mock.calls[0][0]).toBe(`${config.url}/auth/v1/recover`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      email: "person@example.com",
    });
  });
  it("verifies a recovery code before updating the password and revokes the temporary session", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "temporary" }))
      .mockResolvedValueOnce(Response.json({ id: "user" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    await resetRecoveredPassword(
      "person@example.com",
      "123456",
      "new-password",
      config,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      email: "person@example.com",
      token: "123456",
      type: "recovery",
    });
    expect(fetcher.mock.calls[1][0]).toBe(`${config.url}/auth/v1/user`);
    expect(fetcher.mock.calls[1][1].method).toBe("PUT");
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer temporary",
    );
    expect(fetcher.mock.calls[2][0]).toBe(
      `${config.url}/auth/v1/logout?scope=local`,
    );
  });
  it("never updates a password after a failed code and redacts the provider error", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "token-secret" }, { status: 400 }),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resetRecoveredPassword(
        "person@example.com",
        "123456",
        "new-password",
        config,
      ),
    ).rejects.toThrow("Recovery could not be completed.");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("attempts session revocation even if updating the password fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "temporary" }))
      .mockResolvedValueOnce(
        Response.json({ message: "sensitive" }, { status: 400 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      resetRecoveredPassword(
        "person@example.com",
        "123456",
        "new-password",
        config,
      ),
    ).rejects.toThrow("Recovery could not be completed.");
    expect(fetcher.mock.calls[2][0]).toContain("logout?scope=local");
  });
});
