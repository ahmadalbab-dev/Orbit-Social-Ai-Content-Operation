# Google AI Studio / Gemini integration

Reviewed 23 October 2026 (Malaysia). Google AI Studio is the developer UI;
Orbit calls the Gemini Developer API from its backend, not the AI Studio website.

## Decision and actual scope

Gemini is useful as an optional provider for all three existing planning paths:

| Orbit path | Implemented by this patch | Not provided by this patch |
| --- | --- | --- |
| Studio | Caption, ideas, rewrite, hashtags, scripts; draft persistence and usage via existing workflow | Research/trend verification, publishing |
| Image Editor assistant | Validated layout, text, colours, crop settings, existing layer changes; optional reduced preview understanding | Generated pixels, automatic subject cutout |
| Video Editor assistant | Validated editable settings and brief-based scene/caption suggestions; optional current-frame understanding | Watching full footage, speech transcription, generated video/audio, multi-clip timeline |

Default: `gemini-3.5-flash-lite`, listed with free input/output in Google's API
pricing. A small explicit allowlist accepts reviewed free-tier text models;
image, music/video generation, arbitrary endpoints and `latest` aliases are
rejected by the text adapter. Quota still depends on the actual Google project.
The allowlist does not make requests free on a billing-enabled project.

Native `generateContent` JSON mode uses a fixed Google endpoint, key in a header,
45-second timeout, bounded response, strict task parsers and STOP-only acceptance.
Thought parts are excluded. Existing workspace membership, billing entitlement,
atomic generation quotas and Studio caching remain in place. Usage includes
reported thinking tokens. `estimatedCostUsd=0` retains the existing provider's
unknown-price convention; it is not proof of zero provider charges.

No automatic provider fallback or retry occurs on 429, denial, malformed or
blocked output. No new dependency, migration or paid feature is enabled.
Local edits, Music search, OAuth, export and the separate image-provider route
are not replaced. The existing optional Gemini image adapter is not live-verified
by this patch; do not enable it expecting the text model's free allowance.

## What the free tier does and does not cover

- Good for development and a bounded pilot of text/visual guidance. Google does
  not guarantee fixed capacity. RPM/TPM/RPD are project/model-specific; inspect
  the project's current limits in AI Studio rather than advertising old numbers.
- Free AI Studio experimentation is not a promise that the corresponding API
  has a free allowance. Current Gemini image-generation and Lyria music-generation
  pricing lists no API free tier. Video generation must be assessed separately.
- Google unpaid-service terms allow submitted content to improve products and
  human review, and instruct users not to submit sensitive/confidential/personal
  information. Do not route customer/private media here indiscriminately.
- Gemini does not repair Openverse Music search, Instagram/Threads OAuth,
  Layers decode/memory limits, green screen, stitching or account selection.

## Setup for review, without switching production

1. In Google AI Studio, open **API keys** and select the intended Cloud project.
   Create an API key if needed. Check the project's plan and rate limits. Use a
   free project with no billing account linked if zero provider spending is the
   requirement. Do not press billing/upgrade to resolve a quota error.
2. Vercel API project: **orbit-ai-studio-api > Settings > Environment Variables**.
   Add the key as Secret `GEMINI_API_KEY` for **Preview**, scoped to branch
   `feat/gemini-editor-integration`. Never use `NEXT_PUBLIC_` or paste a key in chat.
   Audit metadata showed this key name already exists for Production only;
   its value, validity and Google project tier were not read or tested.
3. After reviewing Google's unpaid-data terms, use these server Config values
   for that same preview branch:

   ```dotenv
   AI_TEXT_PROVIDER=gemini
   GEMINI_TEXT_MODEL=gemini-3.5-flash-lite
   GEMINI_ALLOW_UNPAID_DATA_USE=true
   GEMINI_ALLOW_PREVIEW_SHARING=false
   ```

4. Set `GEMINI_ALLOW_PREVIEW_SHARING=true` only for media permitted under those
   terms. The editor checkbox is off by default and must also be selected before
   one reduced frame is sent. Full original media is not uploaded by this path.
5. The preview web deployment must relay to the matching preview API and have
   working workspace authentication. Fix its `API_URL`/CORS pairing before live
   acceptance; the Google key belongs only in the API project. Redeploy preview
   after environment changes. This branch depends on PR #12's current head.
6. Production stays on the existing provider until the patch is released and
   production acceptance is authorized. Rollback is explicit provider selection
   back to `groq`, with its existing key/model. No runtime fallback hides failure.

## Acceptance and current evidence

Automated fixtures verify Studio draft persistence, independent image credentials,
quota denial, missing key/data acknowledgement, preview opt-in, text and both
editor contracts, malformed/truncated/blocked output, status handling and retained
Groq/HF behavior. These are simulated provider responses, not live inference.

For live acceptance use public/synthetic input: generate a Malay Studio caption,
save/reload its revision, prepare/apply/undo Image and Video Editor changes, then
test an explicitly shared reduced preview. Confirm request identity/model, output
and usage without logging keys or prompt/media payloads. Verify no dispatch on
quota denial or disabled consent. No live Google request or production release
has been performed for this patch.

## Official sources

- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Project limits: https://ai.google.dev/gemini-api/docs/rate-limits
- API key setup: https://ai.google.dev/gemini-api/docs/api-key
- Structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- Data terms: https://ai.google.dev/gemini-api/terms
- Video capabilities: https://ai.google.dev/gemini-api/docs/video
