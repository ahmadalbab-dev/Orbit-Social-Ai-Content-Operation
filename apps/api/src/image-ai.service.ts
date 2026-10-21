import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CLOUDFLARE_IMAGE_MODEL,
  CloudflareImageEditor,
  GEMINI_IMAGE_MODEL,
  GeminiImageEditor,
  HF_IMAGE_MODEL,
  HuggingFaceImageEditor,
  validateImageEdit,
} from "@sma/ai";
import { DatabaseService } from "./database.service";
import { BillingService } from "./billing.service";
import { requireRole } from "./workflow.service";
import type { RequestIdentity } from "./security";
import { aiServiceFailure } from "./ai-errors";

@Injectable()
export class ImageAiService {
  constructor(
    private readonly db: DatabaseService,
    private readonly billing: BillingService,
  ) {}
  private imageConfig() {
    const selected = process.env.AI_IMAGE_PROVIDER ?? "huggingface";
    const provider =
      selected === "gemini" ||
      selected === "huggingface" ||
      selected === "cloudflare"
        ? selected
        : null;
    const apiKey =
      provider === "gemini"
        ? process.env.GEMINI_API_KEY
        : provider === "huggingface"
          ? process.env.HF_TOKEN
          : provider === "cloudflare"
            ? process.env.CLOUDFLARE_API_TOKEN
            : undefined;
    const accountId =
      provider === "cloudflare" ? process.env.CLOUDFLARE_ACCOUNT_ID : undefined;
    return {
      provider,
      apiKey,
      accountId,
      configured:
        !!provider &&
        Boolean(apiKey?.trim()) &&
        !/[\r\n]/.test(apiKey ?? "") &&
        (provider !== "cloudflare" ||
          (accountId?.length === 32 &&
            /^[a-fA-F0-9]{32}$/.test(accountId) &&
            apiKey!.trim().length <= 1024 &&
            !/[^\x21-\x7e]/.test(apiKey!.trim()))),
    };
  }
  status() {
    const config = this.imageConfig();
    return {
      configured: config.configured,
      verified: false,
      model:
        config.provider === "gemini"
          ? GEMINI_IMAGE_MODEL
          : config.provider === "huggingface"
            ? HF_IMAGE_MODEL
            : config.provider === "cloudflare"
              ? CLOUDFLARE_IMAGE_MODEL
              : null,
      provider: config.provider === "huggingface" ? "fal-ai" : config.provider,
      maxInputBytes: 2097152,
      maxOutputBytes: 4194304,
    };
  }
  async edit(identity: RequestIdentity, input: unknown) {
    requireRole(identity);
    let body: ReturnType<typeof validateImageEdit>;
    try {
      body = validateImageEdit(input);
    } catch {
      throw new BadRequestException(
        "Upload a PNG or JPEG up to 2 MiB and an editing instruction up to 2,000 characters.",
      );
    }
    if (
      /\b(?:add|insert|attach|include|put|tambah|masuk(?:kan)?|letak|sertakan)[\s\S]{0,80}(?:music|muzik|audio|soundtrack|song|lagu|voiceover|suara)\b/i.test(
        body.prompt,
      )
    )
      throw new BadRequestException(
        "Music cannot be embedded in a PNG or JPEG. Open Music & sound under Turn your image or carousel into a movie, upload audio, then export an image movie. No AI request was sent.",
      );
    const config = this.imageConfig();
    await this.reserveAttempt(identity, config.configured);
    try {
      if (config.provider === "cloudflare")
        return await new CloudflareImageEditor(
          config.apiKey!,
          config.accountId!,
        ).edit(body);
      return config.provider === "gemini"
        ? await new GeminiImageEditor(config.apiKey!).edit(body)
        : await new HuggingFaceImageEditor(config.apiKey!).edit(body);
    } catch (error) {
      throw aiServiceFailure(
        error,
        "AI image editing did not complete. Retry later or check the image provider connection.",
      );
    }
  }
  async reserveAttempt(
    identity: RequestIdentity,
    configured = this.imageConfig().configured,
  ) {
    requireRole(identity);
    if (!configured)
      throw new ServiceUnavailableException("AI editing is not configured");
    await this.billing.requirePaidAccess(identity.workspaceId);
    const limit = Number(process.env.AI_MONTHLY_GENERATION_LIMIT ?? 100);
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new ServiceUnavailableException("AI quota is not configured");
    const period = new Date().toISOString().slice(0, 7);
    await this.db.aiQuota.upsert({
      where: {
        workspaceId_period: { workspaceId: identity.workspaceId, period },
      },
      create: { workspaceId: identity.workspaceId, period },
      update: {},
    });
    const reserved = await this.db.aiQuota.updateMany({
      where: { workspaceId: identity.workspaceId, period, used: { lt: limit } },
      data: { used: { increment: 1 } },
    });
    if (!reserved.count)
      throw new ForbiddenException(
        "Workspace monthly AI generation quota reached",
      );
    // Dispatched attempts stay metered even on ambiguous provider/network failures.
  }
}
