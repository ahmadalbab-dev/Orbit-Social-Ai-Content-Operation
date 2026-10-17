import { Body, Controller, Get, Param, Post, Put, Req, ServiceUnavailableException } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { DatabaseService } from "./database.service";
import { IdentityOnly, Public, type RequestIdentity } from "./security";
import { WorkspaceService } from "./workspace.service";
import { textAiConfig } from "./text-ai.config";
type Request = {identity:RequestIdentity};
@Controller()
export class AppController {
  constructor(private readonly workflow: WorkflowService,private readonly db:DatabaseService,private readonly workspaces:WorkspaceService) {}
  @Public() @Get("health") health() { return {status:"ok",service:"orbit-api",timestamp:new Date().toISOString()}; }
  @Public() @Get("ready") async ready() { try {await this.db.readiness();return {status:"ready",dependencies:{database:"connected"},livePublishing:false};}catch{throw new ServiceUnavailableException("Database not ready");} }
  @IdentityOnly() @Get("workspaces") listWorkspaces(@Req() req:Request) {return this.workspaces.list(req.identity);}
  @IdentityOnly() @Post("workspaces") createWorkspace(@Req() req:Request,@Body() body:unknown) {return this.workspaces.create(req.identity,body);}
  @Get("ai/status") aiStatus(){const {configured,provider}=textAiConfig();return {configured,provider,verified:false};}
  @Get("integrations/status") integrationStatus(){return {connectorMode:"disabled",livePublishing:false,providers:Object.fromEntries(["facebook","instagram","threads"].map(p=>[p,{configured:false,requiresOwnerAuthorization:true}]))};}
  @Get("brands") brands(@Req() req:Request){return this.workflow.listBrands(req.identity.workspaceId);}
  @Get("content") list(@Req() req:Request){return this.workflow.list(req.identity.workspaceId);}
  @Post("brands") createBrand(@Req() req:Request,@Body() body:unknown){return this.workflow.createBrand(req.identity,body);}
  @Put("brands/:id") updateBrand(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.workflow.updateBrand(req.identity,id,body);}
  @Post("content/manual") manual(@Req() req:Request,@Body() body:unknown){return this.workflow.manual(req.identity,body);}
  @Post("content/generate") generate(@Req() req:Request,@Body() body:unknown){return this.workflow.generate(req.identity,body);}
  @Put("content/:id/review") review(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.workflow.review(req.identity,id,body);}
  @Post("content/:id/approve") approve(@Req() req:Request,@Param("id") id:string,@Body() body:{expectedRevision:number}){return this.workflow.approve(req.identity,id,body?.expectedRevision);}
  @Post("content/:id/schedule") schedule(@Req() req:Request,@Param("id") id:string,@Body() body:unknown){return this.workflow.schedule(req.identity,id,body);}
  @Post("content/:id/publish") publish(@Req() req:Request,@Param("id") id:string,@Body() body:{expectedRevision:number}){return this.workflow.publish(req.identity,id,body?.expectedRevision);}
}
