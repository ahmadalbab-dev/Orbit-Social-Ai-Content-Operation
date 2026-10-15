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

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [AppController, MediaController, BillingController],
  providers: [BillingService, MediaService, WorkflowService, DatabaseService, WorkspaceService, TenantAuthGuard, { provide: APP_GUARD, useClass: TenantAuthGuard }, { provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
