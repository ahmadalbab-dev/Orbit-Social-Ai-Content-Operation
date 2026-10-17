import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { HuggingFaceVideoPlanner, validateVideoPlanInput } from "@sma/ai";
import { ImageAiService } from "./image-ai.service";
import type { RequestIdentity } from "./security";
import { aiServiceFailure } from "./ai-errors";
@Injectable()
export class VideoAiService {
  constructor(private readonly quota: ImageAiService) {}
  async plan(identity: RequestIdentity, input: unknown) {
    let brief: ReturnType<typeof validateVideoPlanInput>;
    try { brief = validateVideoPlanInput(input); } catch { throw new BadRequestException("Provide a video brief up to 3,000 characters and duration between 0 and 600 seconds."); }
    // Constructor validates server model before charging the shared AI attempt quota.
    let provider: HuggingFaceVideoPlanner;
    try { provider = new HuggingFaceVideoPlanner(process.env.HF_TOKEN ?? "", process.env.HF_MODEL); }
    catch { throw new ServiceUnavailableException("AI video planning is not configured"); }
    await this.quota.reserveAttempt(identity);
    try { return await provider.plan(brief); }
    catch (error) { throw aiServiceFailure(error, "AI video plan did not complete. Check inference access and retry later."); }
  }
}
