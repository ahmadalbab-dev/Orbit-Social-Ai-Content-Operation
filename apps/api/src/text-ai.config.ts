import { getVercelOidcTokenSync } from "@vercel/oidc";
import { DEFAULT_GATEWAY_MODEL, DEFAULT_GEMINI_TEXT_MODEL, isValidTextModel } from "@sma/ai";
/** Provider choice is server-only. Explicit selections never silently fall back. */
export function textAiConfig(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.AI_TEXT_PROVIDER ?? (env.HF_TOKEN ? "huggingface" : env.OPENAI_API_KEY ? "openai" : "huggingface");
  const gatewayToken = gatewayCredential(env);
  const apiKey = provider === "gateway" ? gatewayToken : provider === "gemini" ? env.GEMINI_API_KEY : provider === "groq" ? env.GROQ_API_KEY : provider === "huggingface" ? env.HF_TOKEN : provider === "openai" ? env.OPENAI_API_KEY : undefined;
  const model = provider === "gateway" ? (env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL) : provider === "gemini" ? (env.GEMINI_TEXT_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL) : provider === "groq" ? env.GROQ_MODEL : provider === "huggingface" ? env.HF_MODEL : env.OPENAI_DEFAULT_MODEL;
  const validProvider = provider === "gateway" || provider === "gemini" || provider === "groq" || provider === "huggingface" || provider === "openai";
  const configured = validProvider && (provider !== "gemini" || env.GEMINI_ALLOW_UNPAID_DATA_USE === "true") && Boolean(apiKey?.trim()) && !/[\r\n]/.test(apiKey ?? "") && (model === undefined || isValidTextModel(model, provider));
  return { provider: validProvider ? provider : null, configured, apiKey, model };
}
/** Configuration metadata only: never probe inference or read workspace usage. */
export function textAiStatus(env: NodeJS.ProcessEnv = process.env) {
  const { configured, provider, model } = textAiConfig(env);
  const unpaidDataUse = provider === "gemini";
  return {
    configured,
    provider,
    verified: false,
    // A missing optional model means the existing provider uses its own default.
    // Never echo an invalid or unconfigured environment value to a client.
    model: configured ? model ?? null : null,
    privacy: {
      unpaidDataUse,
      unpaidDataUseAcknowledged: unpaidDataUse && env.GEMINI_ALLOW_UNPAID_DATA_USE === "true",
      previewSharingAllowed: configured && (
        (provider === "gemini" && env.GEMINI_ALLOW_PREVIEW_SHARING === "true") ||
        (provider === "gateway" && env.AI_GATEWAY_ALLOW_PREVIEW_SHARING === "true") ||
        provider === "groq"
      ),
    },
  };
}
/** Read the current Vercel request context on every call; never cache OIDC tokens. */
export function gatewayCredential(env: NodeJS.ProcessEnv = process.env) {
  let gatewayToken = env.AI_GATEWAY_API_KEY;
  if (!gatewayToken) {
    try { gatewayToken = env === process.env ? getVercelOidcTokenSync() : env.VERCEL_OIDC_TOKEN; } catch { gatewayToken = undefined; }
  }
  return gatewayToken;
}
