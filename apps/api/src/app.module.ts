import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { WorkflowService } from "./workflow.service";
import { DatabaseService } from "./database.service";
import { WorkspaceService } from "./workspace.service";
import { TenantAuthGuard } from "./security";
import { ImageAiController } from "./image-ai.controller";
import { ImageAiService } from "./image-ai.service";
import { VideoAiController } from "./video-ai.controller";
import { VideoAiService } from "./video-ai.service";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [AppController, MediaController, BillingController, ImageAiController, VideoAiController],
  providers: [VideoAiService, ImageAiService, BillingService, MediaService, WorkflowService, DatabaseService, WorkspaceService, TenantAuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: TenantAuthGuard }]
})
export class AppModule {}
