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
export interface UsageStore { find(workspaceId: string, requestHash: string): Promise<ContentVariant[] | null>; monthlyCost(workspaceId: string): Promise<number>; save(workspaceId: string, variants: ContentVariant[], usage: UsageRecord): Promise<void>; }
export class MemoryUsageStore implements UsageStore {
  private cache = new Map<string, ContentVariant[]>();
  async find(workspaceId: string, hash: string) { return this.cache.get(`${workspaceId}:${hash}`) ?? null; }
  async monthlyCost() { return 0; }
  async save(workspaceId: string, variants: ContentVariant[], usage: UsageRecord) { this.cache.set(`${workspaceId}:${usage.requestHash}`, variants); }
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
    const parsed = variantsSchema.parse(JSON.parse(response.output_text));
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const usage = { requestHash, model, inputTokens, outputTokens, estimatedCostUsd: estimateCost(model, inputTokens, outputTokens), cached: false };
    await this.store.save(input.workspaceId, parsed.variants, usage);
    return { variants: parsed.variants, usage };
  }
}
export function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const rate = model.includes("nano") ? { input: 0.1, output: 0.4 } : { input: 0.4, output: 1.6 };
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
