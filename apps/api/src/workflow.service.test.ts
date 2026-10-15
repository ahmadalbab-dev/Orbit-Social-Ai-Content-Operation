import { describe, expect, it, vi } from "vitest";
import { WorkflowService } from "./workflow.service";
import type { DatabaseService } from "./database.service";
const identity={sub:"auth-a",userId:"user-a",workspaceId:"workspace-a",role:"OWNER"};
const variants=[{platform:"facebook",copy:"Updated copy",hashtags:[],callToAction:"Read more"}];
function setup(item:any={id:"content-a",workspaceId:"workspace-a",revision:2,status:"APPROVED",updatedAt:new Date(),metadata:{variants}}){
  const contentItem={findFirst:vi.fn(async({where}:any)=>where.workspaceId===item?.workspaceId?item:null),updateMany:vi.fn(async({data}:any)=>{Object.assign(item,data);return {count:1};})};
  const tx={contentItem,approval:{findFirst:vi.fn(async()=>({status:"APPROVED"})),create:vi.fn()},schedule:{deleteMany:vi.fn(),create:vi.fn()},contentRevision:{create:vi.fn()}};
  const db={...tx,$transaction:async(fn:any)=>fn(tx)} as unknown as DatabaseService;
  return {service:new WorkflowService(db),tx,item};
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
