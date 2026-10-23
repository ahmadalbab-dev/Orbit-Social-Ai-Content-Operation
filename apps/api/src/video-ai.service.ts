import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { GatewayVideoPlanner, GeminiVideoPlanner, GroqVideoPlanner, HuggingFaceVideoPlanner, validateVideoPlanInput } from "@sma/ai";
import { ImageAiService } from "./image-ai.service";
import type { RequestIdentity } from "./security";
import { aiServiceFailure } from "./ai-errors";
import { textAiConfig } from "./text-ai.config";
@Injectable()
export class VideoAiService {
  constructor(private readonly quota: ImageAiService) {}
  async plan(identity: RequestIdentity, input: unknown) {
    let brief: ReturnType<typeof validateVideoPlanInput>;
    try { brief = validateVideoPlanInput(input); } catch { throw new BadRequestException("Provide a video brief up to 3,000 characters and duration between 0 and 600 seconds."); }
    // Constructor validates server model before charging the shared AI attempt quota.
    let provider: HuggingFaceVideoPlanner;
    const config = textAiConfig();
    try {
      if (!config.configured || config.provider === "openai") throw new Error();
      provider = config.provider === "gateway" ? new GatewayVideoPlanner(config.apiKey!,config.model) : config.provider === "gemini" ? new GeminiVideoPlanner(config.apiKey!, config.model) : config.provider === "groq" ? new GroqVideoPlanner(config.apiKey!, config.model) : new HuggingFaceVideoPlanner(config.apiKey!, config.model);
    }
    catch { throw new ServiceUnavailableException("AI video planning is not configured"); }
    await this.quota.reserveAttempt(identity, true);
    try { return await provider.plan(brief); }
    catch (error) { throw aiServiceFailure(error, "AI video plan did not complete. Check inference access and retry later."); }
  }
}
