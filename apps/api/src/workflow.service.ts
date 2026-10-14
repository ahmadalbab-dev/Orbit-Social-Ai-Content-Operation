import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { OpenAiContentProvider, MemoryUsageStore } from "@sma/ai";
import { ConnectorRegistry, MockConnector } from "@sma/social-connectors";
import { socialPlatforms, type ContentVariant, type SocialPlatform } from "@sma/types";

type Brand = { id: string; workspaceId: string; name: string; voice: string; audience: string };
type Content = { id: string; workspaceId: string; brandId: string; topic: string; status: string; variants: ContentVariant[]; revision: number; source: "ai" | "demo"; approvedBy?: string; approvedRevision?: number; approval?: { revision: number; actorId: string; approvedAt: string }; scheduledFor?: string; publishResult?: unknown };
const variantsValid = (variants: ContentVariant[]) => Array.isArray(variants) && variants.length > 0 && variants.length <= socialPlatforms.length && new Set(variants.map(v => v?.platform)).size === variants.length && variants.every(v => v && socialPlatforms.includes(v.platform) && typeof v.copy === "string" && v.copy.trim().length > 0 && v.copy.length <= 4000 && Array.isArray(v.hashtags) && v.hashtags.length <= 12 && v.hashtags.every(h => typeof h === "string" && h.length <= 100) && typeof v.callToAction === "string" && v.callToAction.length <= 240);
@Injectable()
export class WorkflowService {
  private brands = new Map<string, Brand>();
  private content = new Map<string, Content>();
  private usageStore = new MemoryUsageStore();
  private registry = new ConnectorRegistry();
  constructor() { for (const p of socialPlatforms) this.registry.register(new MockConnector(p)); }
  list(workspaceId: string) { return structuredClone([...this.content.values()].filter(item => item.workspaceId === workspaceId)); }
  createBrand(workspaceId: string, input: Omit<Brand, "id" | "workspaceId">) {
    if (!input || [input.name, input.voice, input.audience].some(v => typeof v !== "string" || !v.trim() || v.length > 2000)) throw new BadRequestException("Name, voice and audience required (maximum 2000 characters each)");
    const brand = { ...input, id: randomUUID(), workspaceId }; this.brands.set(brand.id, brand); return structuredClone(brand);
  }
  async generate(workspaceId: string, input: { brandId: string; topic: string; platforms: SocialPlatform[] }) {
    if (!input || typeof input.topic !== "string" || !input.topic.trim() || input.topic.length > 4000 || !Array.isArray(input.platforms) || !input.platforms.length || new Set(input.platforms).size !== input.platforms.length || !input.platforms.every(p => socialPlatforms.includes(p))) throw new BadRequestException("Valid topic and unique supported platforms required");
    const brand = this.brands.get(input.brandId);
    if (!brand || brand.workspaceId !== workspaceId) throw new NotFoundException("Brand not found in workspace");
    let variants: ContentVariant[];
    if (process.env.OPENAI_API_KEY) {
      const ai = new OpenAiContentProvider(this.usageStore, { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_DEFAULT_MODEL, monthlyBudgetUsd: Number(process.env.AI_MONTHLY_BUDGET_USD ?? 10) });
      variants = (await ai.generateVariants({ workspaceId, brandName: brand.name, voice: brand.voice, audience: brand.audience, topic: input.topic, platforms: input.platforms })).variants;
    } else variants = input.platforms.map(platform => ({ platform, copy: input.topic, hashtags: [], callToAction: "" }));
    if (!variantsValid(variants)) throw new BadRequestException("Generated variants need valid content");
    const item: Content = { id: randomUUID(), workspaceId, brandId: brand.id, topic: input.topic, status: "DRAFT", variants, revision: 1, source: process.env.OPENAI_API_KEY ? "ai" : "demo" };
    this.content.set(item.id, item); return structuredClone(item);
  }
  review(workspaceId: string, id: string, variants: ContentVariant[], expectedRevision: number) {
    const item = this.requireItem(workspaceId, id);
    this.checkRevision(item, expectedRevision);
    if (item.status === "SIMULATING" || item.status === "SIMULATED") throw new ConflictException("Create new content after simulation");
    if (!variantsValid(variants)) throw new BadRequestException("Valid unique platform variants required");
    item.variants = structuredClone(variants); item.revision++; item.status = "DRAFT"; delete item.approval; delete item.approvedBy; delete item.approvedRevision; delete item.scheduledFor; return structuredClone(item);
  }
  approve(workspaceId: string, id: string, actorId: string, expectedRevision: number) {
    const item = this.requireItem(workspaceId, id);
    this.checkRevision(item, expectedRevision);
    if (item.status !== "DRAFT") throw new ConflictException("Only a draft can be approved");
    if (!variantsValid(item.variants)) throw new BadRequestException("Valid content required");
    item.approval = { revision: item.revision, actorId, approvedAt: new Date().toISOString() }; item.approvedBy = actorId; item.approvedRevision = item.revision; item.status = "APPROVED"; return structuredClone(item);
  }
  schedule(workspaceId: string, id: string, scheduledFor: string, expectedRevision: number) {
    const item = this.requireApproved(workspaceId, id);
    this.checkRevision(item, expectedRevision);
    if (typeof scheduledFor !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(scheduledFor) || !Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now()) throw new BadRequestException("Future ISO timestamp with timezone required");
    item.scheduledFor = new Date(scheduledFor).toISOString(); item.status = "SCHEDULED"; return structuredClone(item);
  }
  async publish(workspaceId: string, id: string) {
    if ((process.env.SOCIAL_CONNECTOR_MODE ?? "mock") !== "mock") throw new ServiceUnavailableException("Live publishing unavailable: OAuth and verified accounts are not implemented");
    const item = this.requireApproved(workspaceId, id);
    if (item.scheduledFor && Date.parse(item.scheduledFor) > Date.now()) throw new ConflictException("Scheduled content is not due");
    item.status = "SIMULATING";
    try {
      const results = await Promise.all(item.variants.map(variant => this.registry.get(variant.platform).publish({ idempotencyKey: createHash("sha256").update(`${id}:${item.revision}:${variant.platform}`).digest("hex"), workspaceId, accountId: `sandbox-${variant.platform}`, platform: variant.platform, text: [variant.copy, variant.callToAction, variant.hashtags.join(" ")].filter(Boolean).join("\n\n") })));
      item.status = "SIMULATED"; item.publishResult = { mode: "mock", simulated: true, results }; return structuredClone(item);
    } catch (error) { item.status = "SIMULATION_FAILED"; throw error; }
  }
  private checkRevision(item: Content, expectedRevision: number) { if (!Number.isInteger(expectedRevision) || item.revision !== expectedRevision) throw new ConflictException("Content revision changed; refresh before editing or approving"); }
  private requireApproved(workspaceId: string, id: string) {
    const item = this.requireItem(workspaceId, id);
    if (!["APPROVED", "SCHEDULED"].includes(item.status) || !item.approval || item.approval.revision !== item.revision) throw new ConflictException("Explicit approval of the current revision required");
    return item;
  }
  private requireItem(workspaceId: string, id: string) { const item = this.content.get(id); if (!item || item.workspaceId !== workspaceId) throw new NotFoundException("Content not found in workspace"); return item; }
}
