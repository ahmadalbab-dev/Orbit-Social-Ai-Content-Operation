import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DatabaseService } from "./database.service";
import type { RequestIdentity } from "./security";
@Injectable()
export class WorkspaceService {
  constructor(private readonly db:DatabaseService){}
  async list(identity:RequestIdentity){
    if(!identity.userId)return [];
    const memberships=await this.db.membership.findMany({where:{userId:identity.userId,workspaceId:{not:null}},include:{workspace:true}});
    return memberships.map(m=>({id:m.workspace!.id,name:m.workspace!.name,role:m.role}));
  }
  async create(identity:RequestIdentity,input:unknown){
    const body=z.object({name:z.string().trim().min(1).max(120)}).strict().safeParse(input);
    if(!body.success)throw new BadRequestException("Workspace name required");
    // Email is never used to authorize membership; stable verified subject is the identity key.
    return this.db.$transaction(async tx=>{
      const user=await tx.user.upsert({where:{authUserId:identity.sub},create:{authUserId:identity.sub,email:`${createIdentityEmail(identity.sub)}@identity.orbit.invalid`},update:{}});
      const slug=randomUUID();
      const org=await tx.organization.create({data:{name:body.data.name,slug}});
      const workspace=await tx.workspace.create({data:{organizationId:org.id,name:body.data.name,slug}});
      await tx.membership.create({data:{userId:user.id,organizationId:org.id,workspaceId:workspace.id,role:"OWNER"}});
      return {id:workspace.id,name:workspace.name,role:"OWNER"};
    });
  }
}
import { createHash } from "node:crypto";
function createIdentityEmail(sub:string){return createHash("sha256").update(sub).digest("hex");}
