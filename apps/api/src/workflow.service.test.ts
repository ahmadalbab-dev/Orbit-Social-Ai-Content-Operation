import { BillingService } from "./billing.service";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowService } from "./workflow.service";
import type { DatabaseService } from "./database.service";
const identity={sub:"auth-a",userId:"user-a",workspaceId:"workspace-a",role:"OWNER"};
const variants=[{platform:"facebook",copy:"Updated copy",hashtags:[],callToAction:"Read more"}];
function setup(item:any={id:"content-a",workspaceId:"workspace-a",revision:2,status:"APPROVED",updatedAt:new Date(),metadata:{variants}}){
  const contentItem={findFirst:vi.fn(async({where}:any)=>where.workspaceId===item?.workspaceId?item:null),findMany:vi.fn(async()=>[item]),updateMany:vi.fn(async({data}:any)=>{Object.assign(item,data);return {count:1};})};
  const tx={contentItem,socialAccount:{findMany:vi.fn(async(_query:any)=>[{id:'account-a',platform:'FACEBOOK',status:'connected',token:{expiresAt:new Date(Date.now()+60000),scopes:['pages_show_list','pages_read_engagement']}}])},approval:{findFirst:vi.fn(async()=>({status:"APPROVED"})),create:vi.fn()},schedule:{deleteMany:vi.fn(),create:vi.fn()},contentRevision:{create:vi.fn()}};
  const db={...tx,$transaction:async(fn:any)=>fn(tx)} as unknown as DatabaseService;
  return {service:new WorkflowService(db, new BillingService(db)),tx,item};
}
describe("tenant and revision workflow",()=>{
  it("never loads a content item in another workspace",async()=>{
    const {service,tx}=setup();
    await expect(service.review({...identity,workspaceId:"workspace-b"},"content-a",{expectedRevision:2,variants})).rejects.toThrow("Content not found");
    expect(tx.contentItem.updateMany).not.toHaveBeenCalled();
  });
  it("rejects a stale editor before changing content",async()=>{
    const {service,tx}=setup();
    await expect(service.review(identity,"content-a",{expectedRevision:1,variants})).rejects.toThrow("Content changed");
    expect(tx.contentRevision.create).not.toHaveBeenCalled();
  });
  it("editing creates a new draft revision and removes the old schedule",async()=>{
    const {service,tx}=setup();
    const result=await service.review(identity,"content-a",{expectedRevision:2,variants});
    expect(result.revision).toBe(3);expect(result.status).toBe("DRAFT");
    expect(tx.schedule.deleteMany).toHaveBeenCalledWith({where:{contentItemId:"content-a",workspaceId:"workspace-a"}});
    expect(tx.contentRevision.create).toHaveBeenCalledWith({data:expect.objectContaining({revision:3,actorId:"user-a"})});
  });
  it("does not schedule an unapproved current revision",async()=>{
    const {service,tx}=setup({id:"content-a",workspaceId:"workspace-a",revision:3,status:"DRAFT"});
    await expect(service.schedule(identity,"content-a",{expectedRevision:3,scheduledFor:"2099-01-01T12:00:00Z"})).rejects.toThrow("Current revision needs approval");
    expect(tx.schedule.create).not.toHaveBeenCalled();
  });
  it("does not approve a blank manual draft",async()=>{
    const {service,tx}=setup({id:"content-a",workspaceId:"workspace-a",revision:1,status:"DRAFT",metadata:{variants:[{platform:"facebook",copy:"   ",hashtags:[],callToAction:""}]}});
    await expect(service.approve(identity,"content-a",1)).rejects.toThrow("Invalid input");
    expect(tx.approval.create).not.toHaveBeenCalled();
  });
  it("editor cannot self-approve",async()=>{
    const {service}=setup();
    await expect(service.approve({...identity,role:"EDITOR"},"content-a",2)).rejects.toThrow("Role cannot");
  });
  it("preview publication never marks a post published",async()=>{
    const {service,tx}=setup();
    const result=await service.publish(identity,"content-a",2);
    expect(result.livePublishing).toBe(false);expect(result.status).toBe("APPROVED");expect(tx.contentItem.updateMany).not.toHaveBeenCalled();
  });
  it("rejects simultaneous edit races atomically",async()=>{
    const {service,tx}=setup();tx.contentItem.updateMany.mockResolvedValue({count:0});
    await expect(service.review(identity,"content-a",{expectedRevision:2,variants})).rejects.toThrow("Content changed");
    expect(tx.contentRevision.create).not.toHaveBeenCalled();
  });
});

describe('saved social account destinations',()=>{
  it('persists workspace-owned connected accounts on a new draft revision and restores them in the list',async()=>{
    const {service,tx}=setup();
    const result=await service.review(identity,'content-a',{expectedRevision:2,variants,socialAccountIds:['account-a']});
    expect(tx.socialAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{workspaceId:'workspace-a',id:{in:['account-a']}}}));
    expect(result).toMatchObject({revision:3,status:'DRAFT',socialAccountIds:['account-a']});
    expect(tx.schedule.deleteMany).toHaveBeenCalledWith({where:{contentItemId:'content-a',workspaceId:'workspace-a'}});
    expect((await service.list('workspace-a'))[0].socialAccountIds).toEqual(['account-a']);
    await expect(service.schedule(identity,'content-a',{expectedRevision:3,scheduledFor:'2099-01-01T12:00:00Z'})).rejects.toThrow('Current revision needs approval');
    expect(tx.approval.create).not.toHaveBeenCalled();
  });
  it('preserves destinations for clients that omit the new optional field',async()=>{
    const {service}=setup({id:'content-a',workspaceId:'workspace-a',revision:2,status:'APPROVED',metadata:{variants,socialAccountIds:['account-a']}});
    expect((await service.review(identity,'content-a',{expectedRevision:2,variants})).socialAccountIds).toEqual(['account-a']);
  });
  it('explicitly clears destinations and invalidates approval without looking up accounts',async()=>{
    const {service,tx}=setup({id:'content-a',workspaceId:'workspace-a',revision:2,status:'APPROVED',metadata:{variants,socialAccountIds:['account-a']}});
    expect(await service.review(identity,'content-a',{expectedRevision:2,variants,socialAccountIds:[]})).toMatchObject({socialAccountIds:[],revision:3,status:'DRAFT'});
    expect(tx.socialAccount.findMany).not.toHaveBeenCalled();
  });
  it.each([['account-a','account-a'],[''],['https://example.test/account'],Array.from({length:21},(_,i)=>`account-${i}`)])('rejects malformed or duplicate destinations %j before writing',async socialAccountIds=>{
    const {service,tx}=setup();
    await expect(service.review(identity,'content-a',{expectedRevision:2,variants,socialAccountIds})).rejects.toThrow('Invalid input');
    expect(tx.socialAccount.findMany).not.toHaveBeenCalled();expect(tx.contentItem.updateMany).not.toHaveBeenCalled();
  });
  it('rejects an unknown or other-workspace account without mutating the draft',async()=>{
    const {service,tx}=setup();tx.socialAccount.findMany.mockResolvedValue([]);
    await expect(service.review(identity,'content-a',{expectedRevision:2,variants,socialAccountIds:['foreign-account']})).rejects.toThrow('Choose connected accounts');
    expect(tx.socialAccount.findMany.mock.calls[0][0].where.workspaceId).toBe('workspace-a');
    expect(tx.contentItem.updateMany).not.toHaveBeenCalled();expect(tx.schedule.deleteMany).not.toHaveBeenCalled();
  });
  it.each(['disconnected','expired','missing token','missing scopes','wrong platform'])('rejects %s destinations before mutating the revision',async reason=>{
    const {service,tx}=setup();
    const account={id:'account-a',platform:reason==='wrong platform'?'THREADS':'FACEBOOK',status:reason==='disconnected'?'disconnected':'connected',token:reason==='missing token'?null:{expiresAt:new Date(reason==='expired'?0:Date.now()+60000),scopes:reason==='missing scopes'?[]:['pages_show_list','pages_read_engagement']}};
    tx.socialAccount.findMany.mockResolvedValue([account] as any);
    await expect(service.review(identity,'content-a',{expectedRevision:2,variants,socialAccountIds:['account-a']})).rejects.toThrow('Choose connected accounts');
    expect(tx.contentItem.updateMany).not.toHaveBeenCalled();expect(tx.contentRevision.create).not.toHaveBeenCalled();
  });
  it('rejects a stale destination edit before account lookup',async()=>{
    const {service,tx}=setup();
    await expect(service.review(identity,'content-a',{expectedRevision:1,variants,socialAccountIds:['account-a']})).rejects.toThrow('Content changed');
    expect(tx.socialAccount.findMany).not.toHaveBeenCalled();
  });
  it('rejects unsupported OAuth platforms even when a draft variant and future token match',async()=>{
    const {service,tx}=setup();
    tx.socialAccount.findMany.mockResolvedValue([{id:'account-a',platform:'YOUTUBE',status:'connected',token:{expiresAt:new Date(Date.now()+60000),scopes:[]}}]);
    const youtubeVariants=[{platform:'youtube',copy:'Public fixture',hashtags:[],callToAction:''}];
    await expect(service.review(identity,'content-a',{expectedRevision:2,variants:youtubeVariants,socialAccountIds:['account-a']})).rejects.toThrow('Choose connected accounts');
    expect(tx.contentItem.updateMany).not.toHaveBeenCalled();
  });
});


describe("AI input validation before quota reservation",()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it.each([
    {label:"brief",topic:"x".repeat(4001)},
    {label:"voice",voice:"x".repeat(1001)},
    {label:"audience",audience:"x".repeat(1001)},
    {label:"serialized Brand Memory",guidelines:{topics:Array.from({length:20},()=>"x".repeat(200))}}
  ])("rejects oversized $label without charging an attempt",async(overrides)=>{
    vi.stubEnv("HF_TOKEN","hf_test");
    const brand={id:"brand-a",name:"Orbit",voice:"Santai",audience:"Creators",guidelines:{},...overrides};
    const aiQuota={upsert:vi.fn(),updateMany:vi.fn()};
    const db={brand:{findFirst:vi.fn().mockResolvedValue(brand)},aiQuota} as unknown as DatabaseService;
    const error=await new WorkflowService(db, new BillingService(db)).generate(identity,{brandId:brand.id,topic:"topic" in overrides?overrides.topic:"KL today",platforms:["threads"]}).catch(error=>error);
    expect(error.getStatus()).toBe(400);
    expect(error.message).toContain("AI input is too long or invalid");
    expect(aiQuota.upsert).not.toHaveBeenCalled();
    expect(aiQuota.updateMany).not.toHaveBeenCalled();
  });
});

describe("publication-ready approval limits",()=>{
  it.each([
    {platform:"threads",copy:"😀".repeat(500),hashtags:[],callToAction:"More"},
    {platform:"instagram",copy:"x".repeat(2200),hashtags:["#KL"],callToAction:""},
    {platform:"x",copy:"x".repeat(281),hashtags:[],callToAction:""}
  ])("keeps oversized $platform content editable but blocks approval",async(variant)=>{
    const {service,tx}=setup({id:"content-a",workspaceId:"workspace-a",revision:1,status:"DRAFT",metadata:{variants:[variant]}});
    const edited=await service.review(identity,"content-a",{expectedRevision:1,variants:[variant]});
    expect(edited.revision).toBe(2);
    await expect(service.approve(identity,"content-a",2)).rejects.toThrow("characters including CTA and hashtags");
    expect(tx.approval.create).not.toHaveBeenCalled();
    expect(edited.status).toBe("DRAFT");
  });
  it("allows exactly 500 Unicode code points on Threads",async()=>{
    const {service,tx}=setup({id:"content-a",workspaceId:"workspace-a",revision:1,status:"DRAFT",metadata:{variants:[{platform:"threads",copy:"😀".repeat(500),hashtags:[],callToAction:""}]}});
    expect((await service.approve(identity,"content-a",1)).status).toBe("APPROVED");
    expect(tx.approval.create).toHaveBeenCalledOnce();
  });
});

describe("paid AI generation gate", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("rejects unpaid workspaces before reserving quota or dispatching AI", async () => {
    vi.stubEnv("HF_TOKEN", "hf_test");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const brand = { id: "brand-a", name: "Orbit", voice: "Santai", audience: "Creators", guidelines: {} };
    const aiQuota = { upsert: vi.fn(), updateMany: vi.fn() };
    const aiUsage = { findUnique: vi.fn(), aggregate: vi.fn(), upsert: vi.fn() };
    const contentItem = { create: vi.fn() };
    const transaction = vi.fn();
    const db = { brand: { findFirst: vi.fn().mockResolvedValue(brand) }, aiQuota, aiUsage, contentItem, $transaction: transaction } as unknown as DatabaseService;
    const requirePaidAccess = vi.fn().mockRejectedValue(Error("An active paid sandbox subscription is required"));
    const billing = { requirePaidAccess } as unknown as BillingService;

    await expect(new WorkflowService(db, billing).generate(identity, {
      brandId: brand.id, topic: "KL today", platforms: ["threads"],
    })).rejects.toThrow("active paid sandbox subscription");

    expect(requirePaidAccess).toHaveBeenCalledExactlyOnceWith(identity.workspaceId);
    expect(aiQuota.upsert).not.toHaveBeenCalled();
    expect(aiQuota.updateMany).not.toHaveBeenCalled();
    expect(aiUsage.findUnique).not.toHaveBeenCalled();
    expect(aiUsage.aggregate).not.toHaveBeenCalled();
    expect(aiUsage.upsert).not.toHaveBeenCalled();
    expect(contentItem.create).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
