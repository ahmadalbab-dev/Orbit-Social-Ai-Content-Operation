# Orbit AI Gateway routing

**Owner decision, 2026-10-23: deferred.** Keep the current direct Gemini/Cloudflare routes and all paid smoke probes off. Do not retry Gateway activation or request card verification unless the owner reopens this work. The adapter below remains available as inactive code.

Implemented 2026-10-23. All model traffic can use the fixed server-only Gateway Chat Completions endpoint (`https://ai-gateway.vercel.sh/v1/chat/completions`). Direct providers remain selectable for explicit rollback; failures never switch providers or models automatically.

| Flow | Server selection | Reviewed Gateway model |
| --- | --- | --- |
| Studio drafts | `AI_TEXT_PROVIDER=gateway` | `google/gemini-3.5-flash-lite` |
| Image/video editor changes, optional single-frame vision | Same text selection | Same text model |
| Suggested video scenes/captions | Same text selection | Same text model |
| Image pixel editing | `AI_IMAGE_PROVIDER=gateway` | `google/gemini-3.1-flash-lite-image` |

`AI_GATEWAY_MODEL` defaults to the reviewed text model; unknown models fail closed. Image routing uses its separate fixed multimodal model. Both were verified against the complete live catalog and require the `google` provider endpoint. No model fallback, search tools or retries are enabled.

## Authentication and data

Vercel requests resolve the current platform OIDC request context with `@vercel/oidc` on each API operation, falling back to its environment token. Tokens are never cached by Orbit. Local/CI deployments may supply `AI_GATEWAY_API_KEY` explicitly; provider keys are never used as Gateway credentials. No key or token is returned by status routes.

Editor preview sharing requires `AI_GATEWAY_ALLOW_PREVIEW_SHARING=true` on the API and the existing user opt-in checkbox. A reduced preview is sent only when included explicitly. Pixel editing sends the image supplied for that action. Existing size limits, strict domain parsers, membership checks, billing checks, durable quotas, workspace cache and revision review remain in place. JSON schemas constrain returned fields; local validators additionally enforce numeric bounds, layer ownership and timing. No new database schema is needed.

Gateway pricing is separate from Google's unpaid API tier. Catalog rates on 2026-10-23: text $0.30 input/$2.50 output per million tokens; image model $0.034 per default image, plus token pricing. Orbit's historical `estimatedCostUsd=0` convention means unestimated, not free; Gateway usage/spend reporting is authoritative. No budgets, auto top-ups or billing settings are changed by this migration.

## Deployment verification

The release script supports `ORBIT_GATEWAY_SMOKE_ON_BUILD=true` only on Preview. It sends public synthetic input through Studio, image editor vision, video planning and one image edit, then validates actual outputs. It logs statuses and usage metadata, never prompt content, image bytes or credentials. It stops after the first failed request. Turn it off after the bounded acceptance run; ordinary builds must not spend inference credits.

Activate on the configured `feat/cloudflare-image-editing` Preview first. Production promotion is a separate release step. Explicit rollback: restore `AI_TEXT_PROVIDER=gemini` and `AI_IMAGE_PROVIDER=cloudflare`, retaining the previous credentials, then redeploy. The migration does not implement OAuth, social publishing, streaming music or generated video footage.
