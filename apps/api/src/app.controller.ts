import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Put, Req } from "@nestjs/common";
import { socialPlatforms } from "@sma/types";
import { z } from "zod";
import type { RequestIdentity } from "./security";
import { WorkflowService } from "./workflow.service";

const text = (max: number) => z.string().max(max).refine(value => value.trim().length > 0);
const platform = z.enum(socialPlatforms);
const variant = z.object({ platform, copy: text(4000), hashtags: z.array(z.string().max(100)).max(12), callToAction: z.string().max(240) }).strict();
const schemas = {
  brand: z.object({ name: text(2000), voice: text(2000), audience: text(2000) }).strict(),
  generate: z.object({ brandId: text(100), topic: text(4000), platforms: z.array(platform).min(1).max(socialPlatforms.length) }).strict(),
  review: z.object({ variants: z.array(variant).min(1).max(socialPlatforms.length), expectedRevision: z.number().int().positive() }).strict(),
  approve: z.object({ expectedRevision: z.number().int().positive() }).strict(),
  schedule: z.object({ scheduledFor: text(100), expectedRevision: z.number().int().positive() }).strict(),
  publish: z.object({}).strict(),
};
function body<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException("Invalid request body");
  return parsed.data;
}

@Controller()
export class AppController {
  constructor(@Inject(WorkflowService) private readonly workflow: WorkflowService) {}
  @Get("health") health() { return { status: "ok", service: "social-media-automation-api", timestamp: new Date().toISOString() }; }
  @Get("ready") ready() { return { status: "ready", dependencies: { database: "not-used", redis: "not-used" }, mode: "memory-demo" }; }
  @Get("integrations/status") integrationStatus() {
    const metaConfigured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);
    const threadsConfigured = Boolean(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI);
    const tiktokConfigured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI);
    return {
      connectorMode: "mock",
      requestedMode: process.env.SOCIAL_CONNECTOR_MODE ?? "mock",
      livePublishingSupported: false,
      persistence: "process-memory-demo",
      scheduledExecutionSupported: false,
      authenticationMode: process.env.NODE_ENV !== "production" && process.env.AUTH_MODE === "local-demo" ? "local-demo" : "signed-workspace-claims",
      providers: {
        facebook: { credentialsConfigured: metaConfigured, connected: false, requiresOwnerAuthorization: true },
        instagram: { credentialsConfigured: metaConfigured, connected: false, requiresOwnerAuthorization: true },
        threads: { credentialsConfigured: threadsConfigured, connected: false, requiresOwnerAuthorization: true },
        tiktok: { credentialsConfigured: tiktokConfigured, connected: false, requiresOwnerAuthorization: true },
      },
    };
  }
  @Get("content") list(@Headers("x-workspace-id") workspaceId = "demo-workspace") { return this.workflow.list(workspaceId); }
  @Post("brands") createBrand(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() input: unknown) { return this.workflow.createBrand(workspaceId, body(schemas.brand, input)); }
  @Post("content/generate") generate(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() input: unknown) { return this.workflow.generate(workspaceId, body(schemas.generate, input)); }
  @Put("content/:id/review") review(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() input: unknown) { const parsed = body(schemas.review, input); return this.workflow.review(workspaceId, id, parsed.variants, parsed.expectedRevision); }
  @Post("content/:id/approve") approve(@Req() request: { identity: RequestIdentity }, @Param("id") id: string, @Body() input: unknown) { return this.workflow.approve(request.identity.workspaceId, id, request.identity.sub, body(schemas.approve, input).expectedRevision); }
  @Post("content/:id/schedule") schedule(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() input: unknown) { const parsed = body(schemas.schedule, input); return this.workflow.schedule(workspaceId, id, parsed.scheduledFor, parsed.expectedRevision); }
  @Post("content/:id/publish") publish(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() input: unknown = {}) { body(schemas.publish, input); return this.workflow.publish(workspaceId, id); }
}
