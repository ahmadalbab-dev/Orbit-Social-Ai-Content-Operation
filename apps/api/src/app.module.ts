import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { WorkflowService } from "./workflow.service";
import { TenantAuthGuard } from "./security";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [AppController],
  providers: [WorkflowService, TenantAuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
