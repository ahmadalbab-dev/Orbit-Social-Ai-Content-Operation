import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutAttempts, createBillingPortal, createCheckout, getBillingStatus, stripeRedirectUrl } from "./billing-api";
import { setApiSession } from "./session-api";

afterEach(() => { vi.unstubAllGlobals(); setApiSession(null); });

describe("billing checkout boundaries", () => {
  it("retains the same intent when retrying a plan, including after switching plans", () => {
    const uuid = vi.fn().mockReturnValueOnce("first").mockReturnValueOnce("second");
    const intent = checkoutAttempts(uuid);
    expect(intent("creator")).toEqual({ plan: "creator", requestId: "first" });
    expect(intent("business")).toEqual({ plan: "business", requestId: "second" });
    expect(intent("creator")).toEqual({ plan: "creator", requestId: "first" });
    expect(uuid).toHaveBeenCalledTimes(2);
  });

  it("accepts only the expected Stripe HTTPS origin for each flow", () => {
    expect(stripeRedirectUrl("https://checkout.stripe.com/c/pay/test#secret", "checkout")).toBe("https://checkout.stripe.com/c/pay/test#secret");
    expect(stripeRedirectUrl("https://billing.stripe.com/p/session/test", "portal")).toBe("https://billing.stripe.com/p/session/test");
    for (const url of ["javascript:alert(1)", "http://checkout.stripe.com/test", "https://checkout.stripe.com.evil.test", "https://evil.test/checkout.stripe.com", "https://checkout.stripe.com@evil.test", "https://user@checkout.stripe.com", "https://checkout.stripe.com:8443", "https://billing.stripe.com/test", "/relative", null]) {
      expect(() => stripeRedirectUrl(url, "checkout")).toThrow("could not be verified");
    }
    expect(() => stripeRedirectUrl("https://checkout.stripe.com/c/pay/test", "portal")).toThrow("could not be verified");
  });

  it("uses the verified workspace session and backend for checkout, without card data", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ url: "https://checkout.stripe.com/c/pay/test" }));
    vi.stubGlobal("fetch", fetcher); setApiSession({ token: "verified", workspaceId: "workspace-a" });
    const intent = { plan: "creator" as const, requestId: "b7be8153-1924-483a-a039-5d424e5d495c" };
    await expect(createCheckout(intent)).resolves.toBe("https://checkout.stripe.com/c/pay/test");
    expect(fetcher.mock.calls[0][0]).toMatch(/\/v1\/billing\/checkout$/);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(intent);
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("x-workspace-id")).toBe("workspace-a");
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
  });

  it("reuses an intent after an ambiguous network failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(Error("network error")).mockResolvedValue(Response.json({ url: "https://checkout.stripe.com/c/pay/test" }));
    vi.stubGlobal("fetch", fetcher); setApiSession({ token: "verified", workspaceId: "workspace-a" });
    const attempt = checkoutAttempts(() => "b7be8153-1924-483a-a039-5d424e5d495c");
    await expect(createCheckout(attempt("creator"))).rejects.toThrow();
    await createCheckout(attempt("creator"));
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  });

  it("uses server status and rejects untrusted portal responses", async () => {
    const status = { enabled: false, mode: "test", plans: [], subscription: null, canManage: false };
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(status)).mockResolvedValueOnce(Response.json({ url: "https://evil.test" }));
    vi.stubGlobal("fetch", fetcher); setApiSession({ token: "verified", workspaceId: "workspace-a" });
    expect(await getBillingStatus()).toEqual(status);
    expect(fetcher.mock.calls[0][0]).toMatch(/\/v1\/billing\/status$/);
    await expect(createBillingPortal()).rejects.toThrow("could not be verified");
  });
});
