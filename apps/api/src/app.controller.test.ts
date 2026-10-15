import { describe, expect, it, vi } from "vitest";
import { AppController } from "./app.controller";
import { WorkflowService } from "./workflow.service";
import type { DatabaseService } from "./database.service";
import type { WorkspaceService } from "./workspace.service";
describe("readiness",()=>{
  it("checks the actual database",async()=>{
    const readiness=vi.fn().mockRejectedValue(new Error("connection refused"));
    const controller=new AppController({} as WorkflowService,{readiness} as unknown as DatabaseService,{} as WorkspaceService);
    expect(controller.health().status).toBe("ok");
    await expect(controller.ready()).rejects.toThrow("Database not ready");
    expect(readiness).toHaveBeenCalledOnce();
  });
});
