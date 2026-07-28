import { Body, Controller, Get, Headers, Param, Post, Put } from "@nestjs/common";
import type { ContentVariant, SocialPlatform } from "@sma/types";
import { WorkflowService } from "./workflow.service";

@Controller()
export class AppController {
  constructor(private readonly workflow: WorkflowService) {}
  @Get("health") health() { return { status: "ok", service: "social-media-automation-api", timestamp: new Date().toISOString() }; }
  @Get("ready") ready() { return { status: "ready", dependencies: { database: "configured", redis: "configured" } }; }
  @Get("integrations/status") integrationStatus() {
    const metaConfigured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);
    const threadsConfigured = Boolean(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI);
    const tiktokConfigured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI);
    return {
      connectorMode: process.env.SOCIAL_CONNECTOR_MODE ?? "mock",
      providers: {
        facebook: { configured: metaConfigured, requiresOwnerAuthorization: true },
        instagram: { configured: metaConfigured, requiresOwnerAuthorization: true },
        threads: { configured: threadsConfigured, requiresOwnerAuthorization: true },
        tiktok: { configured: tiktokConfigured, requiresOwnerAuthorization: true },
      },
    };
  }
  @Get("content") list(@Headers("x-workspace-id") workspaceId = "demo-workspace") { return this.workflow.list(workspaceId); }
  @Post("brands") createBrand(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() body: { name: string; voice: string; audience: string }) { return this.workflow.createBrand(workspaceId, body); }
  @Post("content/generate") generate(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Body() body: { brandId: string; topic: string; platforms: SocialPlatform[] }) { return this.workflow.generate(workspaceId, body); }
  @Put("content/:id/review") review(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() body: { variants: ContentVariant[] }) { return this.workflow.review(workspaceId, id, body.variants); }
  @Post("content/:id/schedule") schedule(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string, @Body() body: { scheduledFor: string }) { return this.workflow.schedule(workspaceId, id, body.scheduledFor); }
  @Post("content/:id/publish") publish(@Headers("x-workspace-id") workspaceId = "demo-workspace", @Param("id") id: string) { return this.workflow.publish(workspaceId, id); }
}
