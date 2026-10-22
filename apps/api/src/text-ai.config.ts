import { DEFAULT_GEMINI_TEXT_MODEL, isValidTextModel } from "@sma/ai";
/** Provider choice is server-only. Explicit selections never silently fall back. */
export function textAiConfig(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.AI_TEXT_PROVIDER ?? (env.HF_TOKEN ? "huggingface" : env.OPENAI_API_KEY ? "openai" : "huggingface");
  const apiKey = provider === "gemini" ? env.GEMINI_API_KEY : provider === "groq" ? env.GROQ_API_KEY : provider === "huggingface" ? env.HF_TOKEN : provider === "openai" ? env.OPENAI_API_KEY : undefined;
  const model = provider === "gemini" ? (env.GEMINI_TEXT_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL) : provider === "groq" ? env.GROQ_MODEL : provider === "huggingface" ? env.HF_MODEL : env.OPENAI_DEFAULT_MODEL;
  const validProvider = provider === "gemini" || provider === "groq" || provider === "huggingface" || provider === "openai";
  const configured = validProvider && (provider !== "gemini" || env.GEMINI_ALLOW_UNPAID_DATA_USE === "true") && Boolean(apiKey?.trim()) && !/[\r\n]/.test(apiKey ?? "") && (model === undefined || isValidTextModel(model, provider));
  return { provider: validProvider ? provider : null, configured, apiKey, model };
}
