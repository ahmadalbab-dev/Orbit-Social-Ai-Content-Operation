import { createHash } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { ContentVariant, SocialPlatform } from "@sma/types";

const variantsSchema = z.object({ variants: z.array(z.object({
  platform: z.enum(["facebook", "instagram", "linkedin", "tiktok", "youtube", "x", "threads", "pinterest"]),
  copy: z.string().max(4000),
  hashtags: z.array(z.string()).max(12),
  callToAction: z.string().max(240)
})) });
export type UsageRecord = { requestHash: string; model: string; inputTokens: number; outputTokens: number; estimatedCostUsd: number; cached: boolean };
export interface UsageStore { find(workspaceId: string, requestHash: string): Promise<ContentVariant[] | null>; monthlyCost(workspaceId: string): Promise<number>; save(workspaceId: string, variants: ContentVariant[], usage: UsageRecord): Promise<void>; recordUsage(workspaceId: string, usage: UsageRecord): Promise<void>; cacheVariants(workspaceId: string, requestHash: string, variants: ContentVariant[]): Promise<void>; }
export class MemoryUsageStore implements UsageStore {
  private cache = new Map<string, { variants: ContentVariant[]; savedAt: number }>();
  private costs = new Map<string, number>();
  private month = new Date().toISOString().slice(0, 7);
  private resetMonth() {
    const month = new Date().toISOString().slice(0, 7);
    if (month !== this.month) { this.month = month; this.costs.clear(); }
  }
  private ensureWorkspace(workspaceId: string) {
    this.resetMonth();
    if (!this.costs.has(workspaceId)) {
      if (this.costs.size >= 1000) throw new AiBudgetExceededError("Demo AI workspace capacity reached");
      this.costs.set(workspaceId, 0);
    }
  }
  async find(workspaceId: string, hash: string) {
    const key = `${workspaceId}:${hash}`, entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.savedAt > 86400000) { this.cache.delete(key); return null; }
    this.cache.delete(key); this.cache.set(key, entry);
    return structuredClone(entry.variants);
  }
  async monthlyCost(workspaceId: string) { this.ensureWorkspace(workspaceId); return this.costs.get(workspaceId)!; }
  async save(workspaceId: string, variants: ContentVariant[], usage: UsageRecord) {
    await this.recordUsage(workspaceId, usage);
    await this.cacheVariants(workspaceId, usage.requestHash, variants);
  }
  async recordUsage(workspaceId: string, usage: UsageRecord) {
    this.ensureWorkspace(workspaceId);
    if (!usage.cached) this.costs.set(workspaceId, this.costs.get(workspaceId)! + usage.estimatedCostUsd);
  }
  async cacheVariants(workspaceId: string, requestHash: string, variants: ContentVariant[]) {
    this.ensureWorkspace(workspaceId);
    const key = `${workspaceId}:${requestHash}`;
    this.cache.delete(key);
    if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { variants: structuredClone(variants), savedAt: Date.now() });
  }
}
export class AiBudgetExceededError extends Error {}

export class OpenAiContentProvider {
  private client: OpenAI;
  constructor(private readonly store: UsageStore, private readonly options: { apiKey: string; model?: string; monthlyBudgetUsd?: number; maxOutputTokens?: number }) {
    this.client = new OpenAI({ apiKey: options.apiKey });
  }
  async generateVariants(input: { workspaceId: string; brandName: string; voice: string; audience: string; topic: string; platforms: SocialPlatform[] }) {
    const stable = JSON.stringify(input);
    const requestHash = createHash("sha256").update(stable).digest("hex");
    const cached = await this.store.find(input.workspaceId, requestHash);
    if (cached) return { variants: cached, usage: { requestHash, model: "cache", inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, cached: true } };
    if (await this.store.monthlyCost(input.workspaceId) >= (this.options.monthlyBudgetUsd ?? 10)) throw new AiBudgetExceededError("Workspace AI budget reached");
    const model = this.options.model ?? "gpt-4.1-mini";
    const response = await this.client.responses.create({
      model,
      input: [{ role: "system", content: "You are a concise brand-safe social content strategist. Avoid unsupported claims. Return JSON only." }, { role: "user", content: stable }],
      text: { format: { type: "json_schema", name: "social_variants", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["variants"], properties: { variants: { type: "array", items: { type: "object", additionalProperties: false, required: ["platform", "copy", "hashtags", "callToAction"], properties: { platform: { type: "string", enum: input.platforms }, copy: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, callToAction: { type: "string" } } } } }
      } } },
      max_output_tokens: this.options.maxOutputTokens ?? 1200
    });
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const usage = { requestHash, model, inputTokens, outputTokens, estimatedCostUsd: estimateCost(model, inputTokens, outputTokens), cached: false };
    // Charge known usage even if response parsing fails. Failed output is not cached.
    await this.store.recordUsage(input.workspaceId, usage);
    const parsed = variantsSchema.parse(JSON.parse(response.output_text));
    await this.store.cacheVariants(input.workspaceId, requestHash, parsed.variants);
    return { variants: parsed.variants, usage };
  }
}
export function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const rate = model.includes("nano") ? { input: 0.1, output: 0.4 } : { input: 0.4, output: 1.6 };
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
