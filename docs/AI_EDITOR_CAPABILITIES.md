# AI editor routing and acceptance

Updated 20 October 2026. This change prepares local/staging functionality only. It does not activate production deployment, provider billing, live publishing, or a paid fallback.

## Engines by job

| Job | Current implementation / selection | Important boundary |
| --- | --- | --- |
| Studio captions, ideas, rewrite, hashtags and scripts | Explicit `AI_TEXT_PROVIDER=groq`, default `openai/gpt-oss-20b`; `openai/gpt-oss-120b` is an operator-selected candidate for more involved instructions | Text output requires review. Account model access and free limits are not inferred from a configured key. |
| Editor layout, existing layers, captions and video timing | The same Groq text provider; optional reduced-frame preview uses `GROQ_VISION_MODEL`, code default `qwen/qwen3.8-27b` | One frame is not full-video understanding; no speech transcription. Qwen is listed as preview by Groq, so validate access before enabling preview sharing. |
| Second uploaded image as background | Local uploaded-asset action with Preview/Apply/Cancel/Undo, plus `backgroundLayerIndex` in the planner contract | Preserves the whole foreground photo. No subject cutout, segmentation or newly generated pixels. The known command does not call a provider. |
| Lightning and thunder | Explicit local, stylized Canvas effect and synthesized Web Audio thunder, reviewed before Apply | Preserves source scene; does not replace its background or generate new footage. Preview is temporary. Local export mixes the effect with existing audio/music. |
| Generative image modification / product visual | HF/fal-ai `Qwen/Qwen-Image-Edit` remains default. Explicit optional `AI_IMAGE_PROVIDER=gemini` selects `gemini-nano-banana-2.1` | Sends one bounded composition preview and instruction. Separate credential/credits required. No provider fallback, retries, or automatic activation. |
| Conversational generative video and synchronized generated audio | Recommendation for a separately scoped paid integration: `gemini-omni-1.1-flash`; Veo 3.1 for extension / frame control | Not implemented in this release. Requires durable asynchronous jobs, media upload consent, storage, quotas and a funded provider. A text model swap cannot provide it. |
| Transcription and auto-subtitles | Candidate `whisper-large-v3-turbo` on Groq | Not wired in this change. Existing captions are brief-based copy, never presented as transcribed speech. |
| Social account connection | OAuth code exchange and encrypted workspace token storage | Separate from AI. Account owner consent required. Live publishing remains off. |

## Existing Groq adapter work

The separate "Semak Adapter Groq Minimal" checkout was located on DESKTOP-ALBAB at `C:\Users\User\Documents\Codex\2026-10-20\new-chat\work\orbit-studio` (baseline `2f6c759`). Its tracked code diff was compared read-only. The shared `isValidTextModel` correction is integrated once here across API configuration, text generation, video planning and editor planning. Bare Groq model identifiers are accepted; HF still requires namespaced identifiers. Existing background-layer and image-provider changes are preserved. The other checkout remains untouched. Two workflow regressions additionally preserve HF image routing when Groq is selected and reject missing Groq credentials before quota reservation. Historical test totals from the separate checkout are not claimed as current validation.

No new dependency or image/video provider SDK is required. API keys stay server-only. A model name in documentation is a candidate, not evidence that the current account can call it.

## Local/staging acceptance

1. Run web, AI adapter, API and OAuth boundary tests and TypeScript checks. Mocked provider tests prove request shape and error behavior only.
2. In browser acceptance, upload two solid-colour images. Preview the second behind the first, Cancel, re-preview, Apply, export and Undo. Check actual pixels and assert no provider POST.
3. Hold an editor-plan response, replace its base media with the same aspect ratio, then release the response. The old proposal must not become applicable. Local media identities are never included in provider JSON.
4. Upload a short clip, prepare lightning/thunder, temporarily Preview and Stop, then Apply and export at speeds 1 and 2. Decode the exported video/audio and check visible lightning and audible thunder. Confirm audio/music preservation separately; do not infer it from a muted-source fixture.
5. Check the Channels dialog centres at phone and desktop viewports, Escape restores focus, and a completed callback triggers a fresh workspace status read rather than trusting the callback query.
6. Test OAuth denial, missing/wrong browser nonce, expired/replayed state, wrong provider family, removed workspace permissions, invalid provider responses, encrypted token writes and workspace-scoped status. Do not use mock tokens as live account evidence.
7. Only after an operator configures a real isolated key/app and grants the required consent: perform one explicit provider call and one OAuth account connection in that isolated environment. Verify actual persisted drafts/connections. Do not enable billing or deploy production as part of this acceptance.

## Sources checked

- Groq model catalogue: https://console.groq.com/docs/models
- Gemini image model selection: https://ai.google.dev/gemini-api/docs/image-generation
- Gemini Interactions request/response schema: https://ai.google.dev/api/interactions-api
- Gemini video routing guidance: https://ai.google.dev/gemini-api/docs/video
- Clipchamp reference features: https://clipchamp.com/en/features/
- OAuth setup and exact callback contract: [META_SOCIAL_SETUP.md](META_SOCIAL_SETUP.md)

Clipchamp's listed AI features include auto-compose, text-to-speech, subtitles, silence/noise removal and image background removal. Those listings are a feature reference, not evidence of unrestricted prompt-driven video editing or parity with this app.

## Browser recording boundary observed in CI

The Linux WebKit 26.5 build in CI has no canvas recording support required by the existing local video exporter. Its real export tests are capability-skipped and a separate browser test must verify the existing unsupported-export message, preserved composition and usable Undo. Chromium must still produce and decode real media, including music and thunder. This is not evidence of physical iPhone Safari export support; that remains an explicit device acceptance check. No fake captureStream implementation or encoder replacement is used to make the tests pass.
