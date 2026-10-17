import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { HF_IMAGE_MODEL, HuggingFaceImageEditor, validateImageEdit } from "@sma/ai";
import { DatabaseService } from "./database.service";
import { BillingService } from "./billing.service";
import { requireRole } from "./workflow.service";
import type { RequestIdentity } from "./security";

@Injectable()
export class ImageAiService {
  constructor(private readonly db: DatabaseService, private readonly billing: BillingService) {}
  status() { return { configured: Boolean(process.env.HF_TOKEN), verified: false, model: HF_IMAGE_MODEL, provider: "fal-ai", maxInputBytes: 2097152, maxOutputBytes: 4194304 }; }
  async edit(identity: RequestIdentity, input: unknown) {
    requireRole(identity);
    let body: ReturnType<typeof validateImageEdit>;
    try { body = validateImageEdit(input); } catch { throw new BadRequestException("Upload a PNG or JPEG up to 2 MiB and an editing instruction up to 2,000 characters."); }
    await this.reserveAttempt(identity);
    try { return await new HuggingFaceImageEditor(process.env.HF_TOKEN!).edit(body); }
    catch { throw new ServiceUnavailableException("AI image editing did not complete. Check provider credit and inference access, then retry later."); }
  }
  async reserveAttempt(identity: RequestIdentity, configured = Boolean(process.env.HF_TOKEN)) {
    requireRole(identity);
    if (!configured) throw new ServiceUnavailableException("AI editing is not configured");
    await this.billing.requirePaidAccess(identity.workspaceId);
    const limit = Number(process.env.AI_MONTHLY_GENERATION_LIMIT ?? 100);
    if (!Number.isSafeInteger(limit) || limit < 1) throw new ServiceUnavailableException("AI quota is not configured");
    const period = new Date().toISOString().slice(0,7);
    await this.db.aiQuota.upsert({ where: { workspaceId_period: { workspaceId: identity.workspaceId, period } }, create: { workspaceId: identity.workspaceId, period }, update: {} });
    const reserved = await this.db.aiQuota.updateMany({ where: { workspaceId: identity.workspaceId, period, used: { lt: limit } }, data: { used: { increment: 1 } } });
    if (!reserved.count) throw new ForbiddenException("Workspace monthly AI generation quota reached");
    // Dispatched attempts stay metered even on ambiguous provider/network failures.

  }
}
