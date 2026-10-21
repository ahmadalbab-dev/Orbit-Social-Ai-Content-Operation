import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HuggingFaceVideoPlanner } from "@sma/ai";
import { VideoAiService } from "./video-ai.service";
import type { ImageAiService } from "./image-ai.service";
const identity = { workspaceId: "ws", userId: "u", sub: "s", role: "EDITOR" };
beforeEach(()=>{vi.stubEnv("HF_TOKEN","hf_fixture");});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("video plan API", () => {
  it("validates before shared quota reservation", async () => { const reserveAttempt = vi.fn(); const service = new VideoAiService({ reserveAttempt } as unknown as ImageAiService); await expect(service.plan(identity, { brief: "", duration: 5 })).rejects.toThrow(); expect(reserveAttempt).not.toHaveBeenCalled(); });
  it("requires shared billing/quota gate before dispatch", async () => { const reserveAttempt = vi.fn().mockRejectedValue(Error("Quota reached")); const provider = vi.spyOn(HuggingFaceVideoPlanner.prototype, "plan"); const service = new VideoAiService({ reserveAttempt } as unknown as ImageAiService); await expect(service.plan(identity, { brief: "hello", duration: 5 })).rejects.toThrow("Quota reached"); expect(provider).not.toHaveBeenCalled(); });
  it("returns suggested structure and masks failures", async () => { const reserveAttempt = vi.fn().mockResolvedValue(undefined); const provider = vi.spyOn(HuggingFaceVideoPlanner.prototype, "plan").mockRejectedValue(Error("secret")); const service = new VideoAiService({ reserveAttempt } as unknown as ImageAiService); await expect(service.plan(identity, { brief: "hello", duration: 5 })).rejects.toThrow("AI video plan did not complete"); expect(reserveAttempt).toHaveBeenCalledExactlyOnceWith(identity,true); expect(provider).toHaveBeenCalled(); });
});
