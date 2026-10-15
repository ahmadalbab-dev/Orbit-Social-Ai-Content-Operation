import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseService } from "./database.service";
import { WorkspaceService } from "./workspace.service";
import { WorkflowService } from "./workflow.service";
import type { RequestIdentity } from "./security";

// Explicit opt-in: this suite writes disposable records to a dedicated test DB.
describe.skipIf(process.env.ORBIT_DATABASE_TESTS !== "true")("PostgreSQL workspace/revision integration", () => {
  const db = new DatabaseService();
  const workspaces = new WorkspaceService(db);
  const workflow = new WorkflowService(db);
  const subject = `integration-${randomUUID()}`;
  const organizations: string[] = [];
  let owner: RequestIdentity;
  let otherWorkspace: string;
  beforeAll(async () => {
    await db.$connect();
    const identity = { sub: subject, userId: "", workspaceId: "", role: "" };
    const a = await workspaces.create(identity, { name: "Integration A" });
    const b = await workspaces.create(identity, { name: "Integration B" });
    const user = await db.user.findUniqueOrThrow({ where: { authUserId: subject } });
    owner = { ...identity, userId: user.id, workspaceId: a.id, role: "OWNER" };
    otherWorkspace = b.id;
    for (const id of [a.id, b.id]) {
      organizations.push((await db.workspace.findUniqueOrThrow({ where: { id } })).organizationId);
    }
  });
  afterAll(async () => {
    // All content/revisions/approvals/schedules cascade from these test orgs.
    await db.organization.deleteMany({ where: { id: { in: organizations } } });
    await db.user.deleteMany({ where: { authUserId: subject } });
    await db.$disconnect();
  });
  it("persists drafts and invalidates approval/schedule after a revision", async () => {
    const brand = await workflow.createBrand(owner, { name: "Orbit test", voice: "Santai", audience: "Creators" });
    const draft = await workflow.manual(owner, { brandId: brand.id, topic: "KL hari ini", platforms: ["facebook"] });
    await expect(workflow.approve(owner, draft.id, 1)).rejects.toThrow("Invalid input");
    await expect(workflow.review({ ...owner, workspaceId: otherWorkspace }, draft.id, { expectedRevision: 1, variants: [{ platform: "facebook", copy: "Blocked", hashtags: [], callToAction: "" }] })).rejects.toThrow();
    expect(await workflow.list(otherWorkspace)).toEqual([]);
    const variants = [{ platform: "facebook", copy: "Suasana Kuala Lumpur", hashtags: [], callToAction: "Kongsi pandangan" }];
    const edited = await workflow.review(owner, draft.id, { expectedRevision: 1, variants });
    expect(edited.revision).toBe(2);
    await workflow.approve(owner, draft.id, 2);
    const scheduled = await workflow.schedule(owner, draft.id, { expectedRevision: 2, scheduledFor: new Date(Date.now() + 3600000).toISOString() });
    expect(scheduled.automaticPublishing).toBe(false);
    const next = await workflow.review(owner, draft.id, { expectedRevision: 2, variants: [{ ...variants[0], copy: "Draf baharu" }] });
    expect(next.status).toBe("DRAFT");
    expect(next.revision).toBe(3);
    expect(await db.schedule.count({ where: { contentItemId: draft.id } })).toBe(0);
    expect(await db.contentRevision.count({ where: { contentItemId: draft.id } })).toBe(3);
    await expect(workflow.schedule(owner, draft.id, { expectedRevision: 3, scheduledFor: new Date(Date.now() + 3600000).toISOString() })).rejects.toThrow("Current revision needs approval");
    await expect(workflow.approve(owner, draft.id, 2)).rejects.toThrow("Content changed");
  });
});
