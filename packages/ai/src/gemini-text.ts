import { AiProviderError, readBoundedAiJson } from './huggingface.js';

export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-3.1-flash-lite';
// Reviewed against Google's API pricing on 2026-10-23. Not a guarantee of
// project quota or zero charges on a billing-enabled Google Cloud project.
export const GEMINI_FREE_TEXT_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'] as const;
export function isGeminiTextModel(model: string) {
  return (GEMINI_FREE_TEXT_MODELS as readonly string[]).includes(model);
}

/** Translate the existing bounded chat contract to Google's native JSON mode.
 * No SDK, file upload, remote image fetch, automatic retry or provider fallback.
 * Returned completions still pass each task's existing strict domain parser.
 */
export function geminiCompletionFetch(fetcher: typeof fetch): typeof fetch {
  return async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    if (!isGeminiTextModel(request.model)) throw new AiProviderError('unconfigured');
    const headers = new Headers(init?.headers);
    const key = headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!key?.trim() || /[\r\n]/.test(key)) throw new AiProviderError('unconfigured');
    const system: {text: string}[] = [];
    const contents: {role: string; parts: unknown[]}[] = [];
    for (const message of request.messages) {
      if (message.role === 'system') { system.push({text: message.content}); continue; }
      const parts = typeof message.content === 'string' ? [{text: message.content}] : message.content.map((part: {type: string; text?: string; image_url?: {url: string}}) => {
        if (part.type === 'text' && typeof part.text === 'string') return {text: part.text};
        const image = part.type === 'image_url' && part.image_url?.url.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+=*)$/);
        if (!image || image[2].length > 700000) throw new AiProviderError('request_rejected');
        return {inlineData: {mimeType: image[1], data: image[2]}};
      });
      contents.push({role: message.role === 'assistant' ? 'model' : 'user', parts});
    }
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`, {
      method: 'POST', redirect: 'error', credentials: 'omit', signal: init?.signal,
      headers: {'x-goog-api-key': key, 'Content-Type': 'application/json'},
      body: JSON.stringify({systemInstruction: {parts: system}, contents, generationConfig: {
        responseMimeType: 'application/json', temperature: request.temperature,
        maxOutputTokens: request.max_tokens ?? request.max_completion_tokens,
      }}),
    });
    if (!response.ok) return response; // Existing callers classify status and cancel body.
    const data = await readBoundedAiJson(response) as {
      candidates?: {finishReason?: string; content?: {parts?: {text?: unknown; thought?: boolean}[]}}[];
      usageMetadata?: {promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number};
    };
    const candidate = data.candidates?.[0];
    if (data.candidates?.length !== 1 || candidate?.finishReason !== 'STOP') throw new AiProviderError('invalid_response');
    const parts = candidate.content?.parts?.filter(part => !part.thought);
    if (!parts?.length || parts.some(part => typeof part.text !== 'string')) throw new AiProviderError('invalid_response');
    const usage = data.usageMetadata;
    return Response.json({choices: [{finish_reason: 'stop', message: {content: parts.map(part => part.text).join('')}}],
      ...(usage ? {usage: {prompt_tokens: usage.promptTokenCount ?? 0, completion_tokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)}} : {}),
    });
  };
}
