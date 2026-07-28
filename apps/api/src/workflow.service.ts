import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { OpenAiContentProvider, MemoryUsageStore } from "@sma/ai";
import { ConnectorRegistry, MockConnector } from "@sma/social-connectors";
import type { ContentVariant, SocialPlatform } from "@sma/types";

type Brand = { id: string; workspaceId: string; name: string; voice: string; audience: string };
type Content = { id: string; workspaceId: string; brandId: string; topic: string; status: string; variants: ContentVariant[]; scheduledFor?: string; publishResult?: unknown };
@Injectable()
export class WorkflowService {
  private brands = new Map<string, Brand>();
  private content = new Map<string, Content>();
  private registry = new ConnectorRegistry();
  constructor() {
    for (const p of ["facebook","instagram","linkedin","tiktok","youtube","x","threads","pinterest"] as SocialPlatform[]) this.registry.register(new MockConnector(p));
  }
  list(workspaceId: string) { return [...this.content.values()].filter((item) => item.workspaceId === workspaceId); }
  createBrand(workspaceId: string, input: Omit<Brand, "id" | "workspaceId">) {
    const brand = { id: randomUUID(), workspaceId, ...input }; this.brands.set(brand.id, brand); return brand;
  }
  async generate(workspaceId: string, input: { brandId: string; topic: string; platforms: SocialPlatform[] }) {
    const brand = this.brands.get(input.brandId);
    if (!brand || brand.workspaceId !== workspaceId) throw new Error("Brand not found in workspace");
    let variants: ContentVariant[];
    if (process.env.OPENAI_API_KEY) {
      const ai = new OpenAiContentProvider(new MemoryUsageStore(), { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_DEFAULT_MODEL, monthlyBudgetUsd: Number(process.env.AI_MONTHLY_BUDGET_USD ?? 10) });
      variants = (await ai.generateVariants({ workspaceId, brandName: brand.name, voice: brand.voice, audience: brand.audience, topic: input.topic, platforms: input.platforms })).variants;
    } else {
      variants = input.platforms.map((platform) => ({ platform, copy: `${input.topic} — shaped for ${brand.audience} in a ${brand.voice} voice.`, hashtags: ["#growth", "#business"], callToAction: "Learn more" }));
    }
    const item = { id: randomUUID(), workspaceId, brandId: brand.id, topic: input.topic, status: "DRAFT", variants };
    this.content.set(item.id, item); return item;
  }
  review(workspaceId: string, id: string, variants: ContentVariant[]) {
    const item = this.requireItem(workspaceId, id); item.variants = variants; item.status = "APPROVED"; return item;
  }
  schedule(workspaceId: string, id: string, scheduledFor: string) {
    const item = this.requireItem(workspaceId, id); item.scheduledFor = scheduledFor; item.status = "SCHEDULED"; return item;
  }
  async publish(workspaceId: string, id: string) {
    const item = this.requireItem(workspaceId, id);
    const results = await Promise.all(item.variants.map((variant) => this.registry.get(variant.platform).publish({
      idempotencyKey: createHash("sha256").update(`${id}:${variant.platform}`).digest("hex"),
      workspaceId, accountId: `sandbox-${variant.platform}`, platform: variant.platform, text: variant.copy
    })));
    item.status = results.every((r) => r.status === "published") ? "PUBLISHED" : "FAILED"; item.publishResult = results; return item;
  }
  private requireItem(workspaceId: string, id: string) {
    const item = this.content.get(id); if (!item || item.workspaceId !== workspaceId) throw new Error("Content not found in workspace"); return item;
  }
}
