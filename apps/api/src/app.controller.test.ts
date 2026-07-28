import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { WorkflowService } from "./workflow.service";
describe("health", () => {
  it("reports ok", () => expect(new AppController(new WorkflowService()).health().status).toBe("ok"));
});
