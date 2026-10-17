import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { AiBudgetExceededError, AiProviderError } from "@sma/ai";

/** Return only our fixed messages, never provider response text or credentials. */
export function aiServiceFailure(error: unknown, fallback: string) {
  if (error instanceof AiBudgetExceededError) {
    return new ForbiddenException("Workspace AI budget reached. Contact your workspace administrator.");
  }
  if (error instanceof AiProviderError) {
    return new ServiceUnavailableException({
      statusCode: 503,
      error: "Service Unavailable",
      code: `AI_${error.code.toUpperCase()}`,
      message: new AiProviderError(error.code).message,
    });
  }
  return new ServiceUnavailableException(fallback);
}
