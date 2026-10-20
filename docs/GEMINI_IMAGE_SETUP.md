# Optional Gemini image connection

The image connection is separate from Groq text planning. HF / fal-ai remains the default.
To opt into Gemini, configure an isolated local or staging **API server environment**:

| Variable | Value |
| --- | --- |
| `AI_IMAGE_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | Your Google Gemini API key, stored as a sensitive secret |

No frontend key or SDK installation is needed. Do not paste keys into chats, source files or `NEXT_PUBLIC_*` variables.

This adapter uses `gemini-nano-banana-2.1` through the Interactions REST API, requests one inline 1K JPEG, and sends the explicit image preview and instruction. It sets `store: false`. Input is validated inline PNG/JPEG up to 2 MiB. Inline PNG/JPEG/WebP results must remain within 4 MiB; remote output URLs are not followed. Requests time out at 45 seconds. Provider errors remain safe and classified. There is no provider fallback or automatic retry.

A configured key does **not** verify model access, provider credits or generation quality. The Google project must have whatever access/billing the model requires. Workspace billing and AI quotas still apply. No paid acceptance request was made as part of this implementation.

To return to HF, set `AI_IMAGE_PROVIDER=huggingface` (or remove the selector), retain `HF_TOKEN`, for that test environment. Keeping both keys never causes a request to try both providers.

Official references checked 20 October 2026:
- https://ai.google.dev/api/interactions-api
- https://ai.google.dev/gemini-api/docs/image-generation

The REST response is parsed from `steps[].type=model_output` and `content[].type=image`, with inline `mime_type` and base64 `data`. SDK convenience properties such as `output_image` are not assumed to exist in raw JSON.

No production environment, provider billing or deployment is activated by these instructions. The output MIME is JPEG because the current Interactions ImageResponseFormat accepts `image/jpeg`; an image editor can still export the resulting local composition as PNG.
