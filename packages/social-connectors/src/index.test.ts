import { describe, expect, it } from "vitest";
import { MockConnector } from "./index";
describe("MockConnector", () => {
  it("publishes idempotently shaped results", async () => {
    const result = await new MockConnector("linkedin").publish({ idempotencyKey: "same-request", workspaceId: "w1", platform: "linkedin", accountId: "a1", text: "Hello" });
    expect(result.status).toBe("published");
    expect(result.externalId).toContain("same-request");
  });
});
