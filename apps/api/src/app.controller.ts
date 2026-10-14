import { Body, Controller, Get, Headers, Param, Post, Put, Req } from "@nestjs/common";
import type { ContentVariant, SocialPlatform } from "@sma/types";
import type { RequestIdentity } from "./security";
import { WorkflowService } from "./workflow.service";

@Controller()
export class AppController {
  constructor(private readonly workflow: WorkflowService) {}
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
  @Post("brands") createBrand(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() body: { name: string; voice: string; audience: string }) { return this.workflow.createBrand(workspaceId, body); }
  @Post("content/generate") generate(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() body: { brandId: string; topic: string; platforms: SocialPlatform[] }) { return this.workflow.generate(workspaceId, body); }
  @Put("content/:id/review") review(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() body: { variants: ContentVariant[]; expectedRevision: number }) { return this.workflow.review(workspaceId, id, body.variants, body.expectedRevision); }
  @Post("content/:id/approve") approve(@Req() request: { identity: RequestIdentity }, @Param("id") id: string, @Body() body: { expectedRevision: number }) { return this.workflow.approve(request.identity.workspaceId, id, request.identity.sub, body.expectedRevision); }
  @Post("content/:id/schedule") schedule(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() body: { scheduledFor: string; expectedRevision: number }) { return this.workflow.schedule(workspaceId, id, body.scheduledFor, body.expectedRevision); }
  @Post("content/:id/publish") publish(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string) { return this.workflow.publish(workspaceId, id); }
}
