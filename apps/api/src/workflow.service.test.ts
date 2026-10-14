import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowService } from "./workflow.service";
import { MockConnector } from "@sma/social-connectors";

describe("review-first demo workflow", () => {
  let service: WorkflowService;
  let item: Awaited<ReturnType<WorkflowService["generate"]>>;
  beforeEach(async () => {
    vi.stubEnv("OPENAI_API_KEY", ""); vi.stubEnv("SOCIAL_CONNECTOR_MODE", "mock");
    service = new WorkflowService();
    const brand = service.createBrand("w", { name: "Azhari", voice: "Santai", audience: "Creators" });
    item = await service.generate("w", { brandId: brand.id, topic: "Suasana KL", platforms: ["facebook", "threads"] });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it("rejects draft scheduling and publication", async () => {
    expect(() => service.schedule("w", item.id, new Date(Date.now()+100000).toISOString(), 1)).toThrow("approval");
    await expect(service.publish("w", item.id)).rejects.toThrow("approval");
  });
  it("invalidates approval after edits and rejects stale approvals", () => {
    service.approve("w", item.id, "owner", 1);
    const edited = service.review("w", item.id, item.variants, 1);
    expect(edited.status).toBe("DRAFT"); expect(edited.approval).toBeUndefined(); expect(edited.revision).toBe(2);
    expect(() => service.approve("w", item.id, "owner", 1)).toThrow("revision");
  });
  it("enforces future timestamp and due time", async () => {
    service.approve("w", item.id, "owner", 1);
    expect(() => service.schedule("w", item.id, "tomorrow", 1)).toThrow("ISO");
    service.schedule("w", item.id, new Date(Date.now()+100000).toISOString(), 1);
    await expect(service.publish("w", item.id)).rejects.toThrow("not due");
  });
  it("labels simulations and prevents concurrent and repeat sends", async () => {
    service.approve("w", item.id, "owner", 1);
    const first = service.publish("w", item.id);
    await expect(service.publish("w", item.id)).rejects.toThrow("approval");
    expect((await first).status).toBe("SIMULATED");
    await expect(service.publish("w", item.id)).rejects.toThrow("approval");
  });
  it("refuses live publishing even with approved content", async () => {
    service.approve("w", item.id, "owner", 1); vi.stubEnv("SOCIAL_CONNECTOR_MODE", "live");
    await expect(service.publish("w", item.id)).rejects.toThrow("Live publishing unavailable");
  });
  it("rejects invalid variants and isolates workspaces", () => {
    expect(() => service.review("w", item.id, [], 1)).toThrow("variants");
    expect(() => service.approve("other", item.id, "owner", 1)).toThrow("not found");
  });
  it("marks failed simulation without claiming publication", async () => {
    service.approve("w", item.id, "owner", 1);
    vi.spyOn(MockConnector.prototype, "publish").mockRejectedValue(new Error("unavailable"));
    await expect(service.publish("w", item.id)).rejects.toThrow("unavailable");
    expect(service.list("w")[0].status).toBe("SIMULATION_FAILED");
  });
});
