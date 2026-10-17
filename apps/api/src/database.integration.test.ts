import { BillingService } from "./billing.service";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { processOneRender } from "@sma/media/worker";
import { createRenderStore } from "../../media-worker/src/store";
import { MediaService } from "./media.service";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DatabaseService } from "./database.service";
import { WorkspaceService } from "./workspace.service";
import { WorkflowService } from "./workflow.service";
import type { RequestIdentity } from "./security";

// Explicit opt-in: this suite writes disposable records to a dedicated test DB.
describe.skipIf(process.env.ORBIT_DATABASE_TESTS !== "true")("PostgreSQL workspace/revision integration", () => {
  const db = new DatabaseService();
  const workspaces = new WorkspaceService(db);
  const workflow = new WorkflowService(db, new BillingService(db));
  const subject = `integration-${randomUUID()}`;
  const organizations: string[] = [];
  let mediaRoot: string;
  let owner: RequestIdentity;
  let otherWorkspace: string;
  beforeAll(async () => {
    await db.$connect();
    mediaRoot=await mkdtemp(path.join(tmpdir(),"orbit-db-media-"));
    vi.stubEnv("MEDIA_ROOT",mediaRoot);
    vi.stubEnv("MEDIA_RENDER_ENABLED","true");
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
    vi.unstubAllEnvs();
    if(mediaRoot) await rm(mediaRoot,{recursive:true,force:true});
  });
  it("reuses parameterized statements across independent runtime clients", async () => {
    // Exercises the same constructor used in production. Transaction poolers can
    // assign either client to the same backend between these transactions.
    const second = new DatabaseService();
    try {
      await second.$connect();
      for (let value = 0; value < 4; value++) {
        const results = await Promise.all([db, second].map(client =>
          client.$transaction(tx => tx.$queryRaw<{ value: number }[]>`SELECT ${value}::int AS value`),
        ));
        expect(results).toEqual([[{ value }], [{ value }]]);
      }
    } finally {
      await second.$disconnect();
    }
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
  it("recovers a durable render lease, rejects stale completion and downloads only in its workspace", async()=>{
    const media=new MediaService(db, new BillingService(db));
    const source=Buffer.from("0000ftypisom-integration-fixture");
    const asset=await media.upload(owner,Readable.from(source),"video/mp4",String(source.length));
    await expect(media.create({...owner,workspaceId:otherWorkspace},{assetId:asset.id,duration:1,format:"portrait"})).rejects.toThrow("Video not found");
    const queued=await media.create(owner,{assetId:asset.id,duration:1,format:"portrait"});
    const store=createRenderStore(db);
    const stale=await store.claim();
    expect(stale?.id).toBe(queued.id);
    expect(await store.claim()).toBeNull();
    await db.mediaRender.update({where:{id:queued.id},data:{leaseUntil:new Date(0)}});
    // The actual SQL claim recovers the interrupted attempt. Renderer bytes are a
    // test fixture; codec correctness is tested by the real FFmpeg media suite.
    await processOneRender(store,mediaRoot,{renderer:async(job:any,directory:string)=>{
      await writeFile(path.join(directory,job.output),source);
      return {output:job.output,duration:1,width:720,height:1280};
    }});
    expect(await store.complete(stale!,"exports/stale.mp4")).toBe(false);
    expect((await db.mediaRender.findUniqueOrThrow({where:{id:queued.id}}))).toMatchObject({status:"SUCCEEDED",attempts:2});
    await expect(media.download(otherWorkspace,queued.id)).rejects.toThrow("Render not found");
    const file=await media.download(owner.workspaceId,queued.id);
    const chunks:Buffer[]=[];
    for await(const chunk of file.getStream())chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(source);
    const cancelled=await media.create(owner,{assetId:asset.id,duration:1,format:"square"});
    expect((await media.cancel(owner,cancelled.id)).status).toBe("CANCELLED");
    expect(await store.claim()).toBeNull();
  });

});
