/** Provider choice is server-only. Explicit selections never silently fall back. */
export function textAiConfig(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.AI_TEXT_PROVIDER ?? (env.HF_TOKEN ? "huggingface" : env.OPENAI_API_KEY ? "openai" : "huggingface");
  const apiKey = provider === "groq" ? env.GROQ_API_KEY : provider === "huggingface" ? env.HF_TOKEN : provider === "openai" ? env.OPENAI_API_KEY : undefined;
  const model = provider === "groq" ? env.GROQ_MODEL : provider === "huggingface" ? env.HF_MODEL : env.OPENAI_DEFAULT_MODEL;
  const validProvider = provider === "groq" || provider === "huggingface" || provider === "openai";
  const configured = validProvider && Boolean(apiKey?.trim()) && !/[\r\n]/.test(apiKey ?? "") && (model === undefined || /^[\w.-]+\/[\w.-]+(?::[\w-]+)?$/.test(model) || (provider === "openai" && /^[\w.-]+$/.test(model)));
  return { provider: validProvider ? provider : null, configured, apiKey, model };
}
