import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { WorkflowService } from "./workflow.service";
describe("health", () => {
  it("reports ok", () => expect(new AppController(new WorkflowService()).health().status).toBe("ok"));
});

describe("request boundaries", () => {
  it("rejects extra fields without disclosing their values", () => {
    const controller = new AppController(new WorkflowService());
    expect(() => controller.createBrand("w", { name: "brand", voice: "voice", audience: "audience", secret: "sensitive" })).toThrow("Invalid request body");
    expect(() => controller.publish("w", "id", { unexpected: true })).toThrow("Invalid request body");
  });
  it("treats SQL-like text as inert content", () => {
    const controller = new AppController(new WorkflowService());
    const name = "'; DROP TABLE brands; --";
    expect(controller.createBrand("w", { name, voice: "voice", audience: "audience" }).name).toBe(name);
  });
});
