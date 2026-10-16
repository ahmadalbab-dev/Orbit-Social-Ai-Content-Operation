import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionRenewal } from "./session-renewal";
import type { AuthSession } from "./auth-client";
const initial = {
  access_token: "access-1",
  refresh_token: "refresh-1",
  expires_in: 120,
};
afterEach(() => {
  vi.useRealTimers();
});
describe("in-memory session renewal", () => {
  it("rotates once for concurrent timer and phone wake-up checks", async () => {
    vi.useFakeTimers();
    let resolve!: (value: AuthSession) => void;
    const refresh = vi.fn(
      () =>
        new Promise<AuthSession>((done) => {
          resolve = done;
        }),
    );
    const renewed = vi.fn(),
      expired = vi.fn();
    const manager = new SessionRenewal(renewed, expired, refresh);
    manager.start(initial);
    await vi.advanceTimersByTimeAsync(90000);
    const a = manager.check(),
      b = manager.check();
    expect(a).toBe(b);
    expect(refresh).toHaveBeenCalledTimes(1);
    resolve({
      access_token: "access-2",
      refresh_token: "refresh-2",
      expires_in: 120,
    });
    await a;
    expect(renewed).toHaveBeenCalledTimes(1);
    expect(expired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(90000);
    expect(refresh).toHaveBeenLastCalledWith("refresh-2");
    manager.stop();
  });
  it("does not restore a signed-out session from a late response", async () => {
    vi.useFakeTimers();
    let resolve!: (value: AuthSession) => void;
    const renewed = vi.fn(),
      expired = vi.fn();
    const manager = new SessionRenewal(
      renewed,
      expired,
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    manager.start(initial);
    await vi.advanceTimersByTimeAsync(90000);
    const pending = manager.check();
    manager.stop();
    resolve(initial);
    await pending;
    expect(renewed).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ends internal access at expiry without inventing a refresh token", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(),
      expired = vi.fn();
    const manager = new SessionRenewal(vi.fn(), expired, refresh);
    manager.start({ access_token: "internal", expires_in: 60 });
    await vi.advanceTimersByTimeAsync(60000);
    expect(expired).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    manager.stop();
  });
  it("clears an invalid or revoked provider session without retry loops", async () => {
    vi.useFakeTimers();
    const expired = vi.fn();
    const refresh = vi.fn().mockRejectedValue(Error("revoked"));
    const manager = new SessionRenewal(vi.fn(), expired, refresh);
    manager.start(initial);
    await vi.advanceTimersByTimeAsync(90000);
    expect(expired).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
