import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { HuggingFaceContentProvider, OpenAiContentProvider, type UsageRecord, type UsageStore } from "@sma/ai";
import { Prisma, type ContentItem, type Platform } from "@sma/database";
import { socialPlatforms, type ContentVariant, type SocialPlatform } from "@sma/types";
import { z } from "zod";
import { DatabaseService } from "./database.service";
import type { RequestIdentity } from "./security";

const brandSchema = z.object({ name: z.string().trim().min(1).max(120), voice: z.string().trim().min(1).max(2000), audience: z.string().trim().min(1).max(2000), language:z.string().max(80).optional(), topics:z.array(z.string().max(200)).max(20).optional() }).strict();
const variantSchema = z.object({ platform: z.enum(socialPlatforms), copy: z.string().trim().min(1).max(10000), hashtags: z.array(z.string().max(120)).max(30), callToAction: z.string().max(500) }).strict();
const variantsSchema = z.array(variantSchema).min(1).max(8).refine(v => new Set(v.map(i => i.platform)).size === v.length, "Duplicate platforms");
function parse<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new BadRequestException("Invalid input"); return result.data; }
export function assertRevision(actual: number, expected: number) { if (!Number.isSafeInteger(expected) || expected !== actual) throw new ConflictException("Content changed; reload before continuing"); }
export function requireRole(identity: RequestIdentity, roles = ["OWNER", "ADMIN", "EDITOR"]) { if (!roles.includes(identity.role)) throw new ForbiddenException("Role cannot perform this action"); }
function json(value: unknown) { return value as Prisma.InputJsonValue; }
export function present(item: ContentItem & { schedules?: {scheduledFor: Date}[] }) {
  const metadata = item.metadata as {variants?: ContentVariant[]; generationMode?: string; publishResult?: unknown} | null;
  return { id: item.id, workspaceId: item.workspaceId, brandId: item.brandId, topic: item.title, variants: metadata?.variants ?? [], revision: item.revision, status: item.status, generationMode: metadata?.generationMode, publishResult: metadata?.publishResult, scheduledFor: item.schedules?.[0]?.scheduledFor.toISOString(), updatedAt: item.updatedAt };
}
@Injectable()
export class WorkflowService {
  constructor(private readonly db: DatabaseService) {}
  async list(workspaceId: string) { return (await this.db.contentItem.findMany({ where: { workspaceId }, include: {schedules: {orderBy:{createdAt:"desc"},take:1}}, orderBy: {updatedAt:"desc"}, take:100 })).map(present); }
  listBrands(workspaceId: string) { return this.db.brand.findMany({ where: {workspaceId}, orderBy: {createdAt:"desc"}, take:100 }); }
  async createBrand(identity: RequestIdentity, input: unknown) { requireRole(identity); const body = parse(brandSchema,input); const {language,topics,...brand}=body; return this.db.brand.create({ data: {workspaceId: identity.workspaceId,...brand,guidelines:json({language:language??"Bahasa Melayu",topics:topics??[]})} }); }
  async updateBrand(identity:RequestIdentity,id:string,input:unknown) {
    requireRole(identity); const {language,topics,...body}=parse(brandSchema,input);
    const updated=await this.db.brand.updateMany({where:{id,workspaceId:identity.workspaceId},data:{...body,guidelines:json({language:language??"Bahasa Melayu",topics:topics??[]})}});
    if(!updated.count)throw new NotFoundException("Brand not found");
    return this.db.brand.findFirst({where:{id,workspaceId:identity.workspaceId}});
  }
  async manual(identity:RequestIdentity,input:unknown) {
    requireRole(identity);
    const body=parse(z.object({brandId:z.string().min(1).max(100),topic:z.string().trim().min(1).max(10000),platforms:z.array(z.enum(socialPlatforms)).min(1).max(8).refine(p=>new Set(p).size===p.length)}).strict(),input);
    const brand=await this.db.brand.findFirst({where:{id:body.brandId,workspaceId:identity.workspaceId}});
    if(!brand)throw new NotFoundException("Brand not found");
    const variants=body.platforms.map(platform=>({platform,copy:"",hashtags:[],callToAction:""}));
    return present(await this.db.contentItem.create({data:{workspaceId:identity.workspaceId,brandId:brand.id,title:body.topic,body:"",platform:body.platforms[0].toUpperCase() as Platform,metadata:json({variants,generationMode:"manual"}),revisions:{create:{revision:1,variants:json(variants),actorId:identity.userId}}}}));
  }
  async generate(identity: RequestIdentity, input: unknown) {
    requireRole(identity);
    const body = parse(z.object({brandId:z.string().min(1).max(100),topic:z.string().trim().min(1).max(10000),platforms:z.array(z.enum(socialPlatforms)).min(1).max(8).refine(p=>new Set(p).size===p.length),mode:z.enum(["caption","ideas","rewrite","hashtags","script"]).optional(),language:z.string().max(80).optional()}).strict(),input);
    const brand = await this.db.brand.findFirst({where:{id:body.brandId,workspaceId:identity.workspaceId}});
    if (!brand) throw new NotFoundException("Brand not found");
    if (!process.env.HF_TOKEN && !process.env.OPENAI_API_KEY) throw new ServiceUnavailableException("Platform AI is not configured");
    const period = new Date().toISOString().slice(0,7); const where={workspaceId_period:{workspaceId:identity.workspaceId,period}};
    const limit = Number(process.env.AI_MONTHLY_GENERATION_LIMIT ?? 100);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new ServiceUnavailableException("AI quota is not configured");
    await this.db.aiQuota.upsert({where,create:{workspaceId:identity.workspaceId,period},update:{}});
    const reserved = await this.db.aiQuota.updateMany({where:{workspaceId:identity.workspaceId,period,used:{lt:limit}},data:{used:{increment:1}}});
    if (!reserved.count) throw new ForbiddenException("Workspace monthly AI generation quota reached");
    try {
      const store: UsageStore = {
        find: async (workspaceId,requestHash) => { const r=await this.db.aiUsage.findUnique({where:{workspaceId_requestHash:{workspaceId,requestHash}}}); return r?.variants as ContentVariant[] | null ?? null; },
        monthlyCost: async workspaceId => Number((await this.db.aiUsage.aggregate({where:{workspaceId,createdAt:{gte:new Date(`${period}-01T00:00:00Z`)}},_sum:{estimatedCostUsd:true}}))._sum.estimatedCostUsd ?? 0),
        save: async (workspaceId,variants,usage:UsageRecord) => { await this.db.aiUsage.upsert({where:{workspaceId_requestHash:{workspaceId,requestHash:usage.requestHash}},create:{workspaceId,...usage,variants:json(variants),purpose:"studio"},update:{}}); }
      };
      const workspace = await this.db.workspace.findUniqueOrThrow({where:{id:identity.workspaceId}});
      const options={monthlyBudgetUsd:Number(workspace.monthlyAiBudgetUsd)};
      const provider = process.env.HF_TOKEN ? new HuggingFaceContentProvider(store,{...options,apiKey:process.env.HF_TOKEN,model:process.env.HF_MODEL}) : new OpenAiContentProvider(store,{...options,apiKey:process.env.OPENAI_API_KEY!,model:process.env.OPENAI_DEFAULT_MODEL});
      const result=await provider.generateVariants({workspaceId:identity.workspaceId,brandName:brand.name,voice:typeof brand.voice==="string"?brand.voice:JSON.stringify(brand.voice),audience:typeof brand.audience==="string"?brand.audience:JSON.stringify(brand.audience),topic:body.topic,platforms:body.platforms,mode:body.mode,language:body.language,brandFacts:JSON.stringify(brand.guidelines??{})});
      const variants=parse(variantsSchema,result.variants);
      const item=await this.db.contentItem.create({data:{workspaceId:identity.workspaceId,brandId:brand.id,title:body.topic,body:variants[0].copy,platform:variants[0].platform.toUpperCase() as Platform,metadata:json({variants,generationMode:"ai"}),revisions:{create:{revision:1,variants:json(variants),actorId:identity.userId}}}});
      return present(item);
    } catch(error) { if(error instanceof BadRequestException) throw error; throw new ServiceUnavailableException("AI generation did not complete; retry later"); }
    // A dispatched attempt remains metered even if the provider fails. Otherwise
    // repeated malformed outputs could bypass the platform spending allowance.
  }
  async review(identity: RequestIdentity, id: string, input: unknown) {
    requireRole(identity); const body=parse(z.object({expectedRevision:z.number().int().positive(),variants:variantsSchema}).strict(),input);
    return this.db.$transaction(async tx=>{
      const item=await this.requireItem(tx,identity.workspaceId,id); assertRevision(item.revision,body.expectedRevision);
      if (["PUBLISHED","PUBLISHING"].includes(item.status)) throw new ConflictException("Published content must be duplicated before editing");
      const next=item.revision+1;
      const changed=await tx.contentItem.updateMany({where:{id,workspaceId:identity.workspaceId,revision:body.expectedRevision,status:{notIn:["PUBLISHED","PUBLISHING"]}},data:{revision:next,status:"DRAFT",body:body.variants[0].copy,metadata:json({variants:body.variants,generationMode:"edited"})}});
      if(!changed.count) throw new ConflictException("Content changed; reload");
      await tx.schedule.deleteMany({where:{contentItemId:id,workspaceId:identity.workspaceId}});
      await tx.contentRevision.create({data:{contentItemId:id,revision:next,variants:json(body.variants),actorId:identity.userId}});
      return present(await this.requireItem(tx,identity.workspaceId,id));
    });
  }
  async approve(identity:RequestIdentity,id:string,expectedRevision:number) {
    requireRole(identity,["OWNER","ADMIN","APPROVER"]);
    return this.db.$transaction(async tx=>{
      const item=await this.requireItem(tx,identity.workspaceId,id); assertRevision(item.revision,expectedRevision);
      parse(variantsSchema,(item.metadata as {variants?:unknown}|null)?.variants);
      const changed=await tx.contentItem.updateMany({where:{id,workspaceId:identity.workspaceId,revision:expectedRevision,status:{in:["DRAFT","IN_REVIEW","APPROVED"]}},data:{status:"APPROVED"}});
      if(!changed.count) throw new ConflictException("Content cannot be approved in its current state");
      await tx.approval.create({data:{contentItemId:id,contentRevision:expectedRevision,reviewerId:identity.userId,status:"APPROVED",decidedAt:new Date()}});
      return present(await this.requireItem(tx,identity.workspaceId,id));
    });
  }
  async schedule(identity:RequestIdentity,id:string,input:unknown) {
    requireRole(identity); const body=parse(z.object({expectedRevision:z.number().int().positive(),scheduledFor:z.string().datetime({offset:true})}).strict(),input);
    const date=new Date(body.scheduledFor); if(date.getTime()<=Date.now()) throw new BadRequestException("Schedule must be in the future");
    return this.db.$transaction(async tx=>{
      const item=await this.requireItem(tx,identity.workspaceId,id); assertRevision(item.revision,body.expectedRevision);
      if(item.status!=="APPROVED" || !await tx.approval.findFirst({where:{contentItemId:id,contentRevision:body.expectedRevision,status:"APPROVED"}})) throw new ConflictException("Current revision needs approval");
      const changed=await tx.contentItem.updateMany({where:{id,workspaceId:identity.workspaceId,revision:body.expectedRevision,status:"APPROVED"},data:{status:"SCHEDULED"}});
      if(!changed.count) throw new ConflictException("Content changed; reload");
      await tx.schedule.create({data:{workspaceId:identity.workspaceId,contentItemId:id,contentRevision:body.expectedRevision,scheduledFor:date}});
      return {...present(await this.requireItem(tx,identity.workspaceId,id)),scheduledFor:date.toISOString(),deliveryMode:"draft-schedule",automaticPublishing:false};
    });
  }
  async publish(identity:RequestIdentity,id:string,expectedRevision:number) {
    requireRole(identity,["OWNER","ADMIN","APPROVER"]); const item=await this.requireItem(this.db,identity.workspaceId,id); assertRevision(item.revision,expectedRevision);
    if(!["APPROVED","SCHEDULED"].includes(item.status)) throw new ConflictException("Current revision needs approval");
    // Publishing is intentionally unavailable until real account binding, queue and approval-revision checks exist in the worker.
    return {...present(item),deliveryMode:"preview",livePublishing:false,message:"Live publishing is disabled; no social post was sent",idempotencyKey:createHash("sha256").update(`${identity.workspaceId}:${id}:${expectedRevision}`).digest("hex")};
  }
  private async requireItem(db:Pick<Prisma.TransactionClient,"contentItem">,workspaceId:string,id:string) { const item=await db.contentItem.findFirst({where:{id,workspaceId}}); if(!item) throw new NotFoundException("Content not found"); return item; }
}
