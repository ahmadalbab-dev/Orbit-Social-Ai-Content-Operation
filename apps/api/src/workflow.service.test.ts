import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowService } from "./workflow.service";
import { OpenAiContentProvider } from "@sma/ai";
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
  it("projects brand fields and enforces independent workspace caps", () => {
    const extra = service.createBrand("other", { name: "A", voice: "B", audience: "C", extra: "discard" } as never);
    expect(extra).not.toHaveProperty("extra");
    for (let i = 1; i < 50; i++) service.createBrand("w", { name: "A", voice: "B", audience: "C" });
    expect(() => service.createBrand("w", { name: "A", voice: "B", audience: "C" })).toThrow("capacity");
    expect(service.createBrand("other", { name: "A", voice: "B", audience: "C" })).toBeTruthy();
  });
  it("bounds total workspaces", () => {
    for (let i = 1; i < 100; i++) service.createBrand(`workspace-${i}`, { name: "A", voice: "B", audience: "C" });
    expect(() => service.createBrand("workspace-101", { name: "A", voice: "B", audience: "C" })).toThrow("workspace capacity");
  });
  it("bounds content records", async () => {
    for (let i = 1; i < 500; i++) await service.generate("w", { brandId: item.brandId, topic: "bounded", platforms: ["facebook"] });
    await expect(service.generate("w", { brandId: item.brandId, topic: "overflow", platforms: ["facebook"] })).rejects.toThrow("record capacity");
  });
  it("rejects concurrent generation and releases the lock on failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    let reject!: (error: Error) => void;
    const pending = new Promise<never>((_, rejectPromise) => { reject = rejectPromise; });
    const generate = vi.spyOn(OpenAiContentProvider.prototype, "generateVariants").mockReturnValueOnce(pending);
    const input = { brandId: item.brandId, topic: "bounded", platforms: ["facebook"] as const };
    const first = service.generate("w", { ...input, platforms: [...input.platforms] });
    await expect(service.generate("w", { ...input, platforms: [...input.platforms] })).rejects.toThrow("already in progress");
    reject(new Error("provider unavailable"));
    await expect(first).rejects.toThrow("provider unavailable");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(service.generate("w", { ...input, platforms: [...input.platforms] })).resolves.toHaveProperty("status", "DRAFT");
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed AI limits before provider use", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_MONTHLY_BUDGET_USD", "NaN");
    const generate = vi.spyOn(OpenAiContentProvider.prototype, "generateVariants");
    await expect(service.generate("w", { brandId: item.brandId, topic: "bounded", platforms: ["facebook"] })).rejects.toThrow("AI limits");
    expect(generate).not.toHaveBeenCalled();
  });
  it("rechecks global capacity after concurrent generation in different workspaces", async () => {
    const records = (service as unknown as { content: Map<string, typeof item> }).content;
    for (let i = 1; i < 1999; i++) records.set(`fixture-${i}`, { ...item, id: `fixture-${i}`, workspaceId: `fixture-workspace-${Math.floor(i / 500)}` });
    const other = service.createBrand("other", { name: "A", voice: "B", audience: "C" });
    vi.stubEnv("OPENAI_API_KEY", "mock-only");
    type Result = Awaited<ReturnType<OpenAiContentProvider["generateVariants"]>>;
    const resolvers: Array<(value: Result) => void> = [];
    vi.spyOn(OpenAiContentProvider.prototype, "generateVariants").mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));
    const first = service.generate("w", { brandId: item.brandId, topic: "A", platforms: ["facebook"] });
    const second = service.generate("other", { brandId: other.id, topic: "B", platforms: ["facebook"] });
    const rejected = expect(second).rejects.toThrow("global record capacity");
    const result: Result = { variants: [{ platform: "facebook", copy: "draft", hashtags: [], callToAction: "" }], usage: { requestHash: "mock", model: "mock", inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, cached: false } };
    resolvers[0](result); await first;
    resolvers[1](result); await rejected;
    expect(records.size).toBe(2000);
  });

});
