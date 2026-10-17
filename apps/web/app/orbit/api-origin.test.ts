import { afterEach, describe, expect, it, vi } from "vitest";
import { apiOrigin } from "./api-origin";
import { api, setApiSession } from "./session-api";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setApiSession(null);
});
describe("workspace credential destinations", () => {
  it("does not fall back to a local service in production", () => {
    expect(apiOrigin(undefined, true)).toBeNull();
    expect(apiOrigin("http://localhost:3001", true)).toBeNull();
    expect(apiOrigin(undefined, false)).toBe("http://localhost:3001");
  });
  it.each([
    "http://api.example.com",
    "https://user:password@api.example.com",
    "https://api.example.com/redirect",
    "https://api.example.com?next=other",
    "https://api.example.com/#fragment",
    "javascript:alert(1)",
  ])("rejects an unsafe or ambiguous API destination %s", (url) => {
    expect(apiOrigin(url, true)).toBeNull();
  });
  it("allows a precise HTTPS origin", () => {
    expect(apiOrigin("https://api.example.com/", true)).toBe(
      "https://api.example.com",
    );
  });
  it("never sends the token when production configuration is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    setApiSession({ token: "private", workspaceId: "workspace-a" });
    await expect(api("/content")).rejects.toThrow("not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "//other.example/path",
    "/../../outside",
    "/%2e%2e/%2e%2e/outside",
    "/content?leak=token",
    "/content\\..\\outside",
  ])("rejects a path outside the API boundary %s", async (path) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    setApiSession({ token: "private", workspaceId: "workspace-a" });
    await expect(api(path)).rejects.toThrow("Invalid workspace API path");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses the same-origin relay while retaining bearer and workspace checks",async()=>{
    vi.stubEnv("NEXT_PUBLIC_API_URL","https://api.example.com");
    const fetcher=vi.fn().mockResolvedValue(Response.json([]));vi.stubGlobal("fetch",fetcher);
    setApiSession({token:"private",workspaceId:"workspace-a"});await api("/content");
    expect(fetcher.mock.calls[0][0]).toBe("/api/workspace/content");
    expect(new Headers(fetcher.mock.calls[0][1].headers).get("authorization")).toBe("Bearer private");
    expect(fetcher.mock.calls[0][1].credentials).toBe("same-origin");
  });
  it("does not expose raw browser transport errors",async()=>{
    vi.stubEnv("NEXT_PUBLIC_API_URL","https://api.example.com");vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new TypeError("Failed to fetch private diagnostic")));
    setApiSession({token:"private",workspaceId:"workspace-a"});await expect(api("/content")).rejects.toThrow("Cannot reach the workspace service");
  });

});
