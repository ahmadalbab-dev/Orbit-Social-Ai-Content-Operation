# Free-first AI implementation for Orbit

Reviewed 24 October 2026, Malaysia. This is an implementation decision and research
record, not a claim that production inference, customer billing or every AI feature
has passed acceptance. Provider terms and account quotas can change.

## Decision

Use the existing authenticated backend with **Gemini for text/planning and
Cloudflare for generated still-image edits**. Complete those user journeys before
adding another platform. Keep Supabase accounts/database and existing editor
state. Keep AI Gateway deferred. Do not enable paid providers, billing accounts,
automatic paid fallback or a new Firebase deployment to make a quota error go away.

Firebase AI Logic is useful, but it is a client SDK/proxy/security integration for
Google models, not a separate pool of free image/video credits. It becomes a
candidate when Live voice or supported on-device inference adds a concrete benefit.
Moving existing server-side calls to it now would add setup without providing free
video or music generation. That prioritization is Orbit's architectural judgment.

## Existing baseline and evidence boundary

The repository already has Gemini Studio draft generation and structured Image/
Video Editor planning, optional reduced-frame sharing, strict result validation,
workspace authorization, generation metering and safe provider error handling.
The reviewed text default is `gemini-3.5-flash-lite`. A plan changes supported
editor settings; it does not itself generate new footage, pixels or audio.

`GEMINI_INTEGRATION.md` records historical synthetic Preview inference for Studio,
Image planning and Video planning at `d9898cabac771c4931a4d11cbcac1bf198df07c9`,
plus a real Cloudflare still-image response. These are historical provider probes,
not new tests performed by this document and not complete signed-in customer
acceptance. Configuration status does not prove model access or free account tier.

The optional Gemini image adapter remains separate and must not be enabled under
the assumption that free Gemini text tokens cover image generation. Live music
catalogue recovery, social OAuth, publishing and device export compatibility are
separate workstreams. No new live success or production release is asserted here.

## Ranked platform choices

| Priority | Platform | Free boundary | Orbit use and decision |
| --- | --- | --- | --- |
| 1 | Direct Gemini Developer API | Eligible models have free usage without linking Cloud Billing; quota belongs to the project, not each subscriber. Current general free candidates include `gemini-3.5-flash-lite` and `gemini-3.8-flash`. | Continue Studio text and structured editor assistance through the existing backend. Keep the verified default until an actual project probe justifies changing it. |
| 1 | Cloudflare Workers AI | Workers Free includes 10,000 neurons/day, account-wide, with requests stopped when exhausted. A neuron is compute, not an image. Workers Paid permits overage. | Keep the existing FLUX.2 Klein still-image edit route. Verify Workers Free/account quota before acceptance; assess text-to-image separately. |
| 2 | Groq | Free developer limits are model/account-specific; successful key creation is not quota verification. | Existing text alternative; Whisper speech-to-text is a useful next candidate for real subtitles, requiring suitable credentials and new media handling. No silent fallback. |
| 3 | Firebase AI Logic | Wrapper is free; Spark with Gemini Developer API allows eligible free models without a payment method. Billing-required models remain billing-required. | Defer client integration until Live voice/on-device value justifies App Check and additional setup. |
| 4 | Hugging Face Inference Providers | Current official pricing lists Free monthly inference credits as **None**; free Hub access and downloadable models do not provide free hosted GPU inference. | Do not rely on it as the automatic free image/video fallback. Any actual funded/account allowance must be verified separately. |
| Later | Transformers.js/browser inference | Local inference avoids cloud inference charges but needs compatible device resources, model downloads and appropriate model licences. | Evaluate small optional local tasks after the primary journeys work. Do not make low-memory mobile clients download large models automatically. |

Cloudflare's catalogue also includes Whisper/MeloTTS candidates. Catalogue presence
does not prove the existing adapter implements transcription/TTS or that the
remaining daily allowance can support Orbit's users. Compare one audio route at a
time instead of installing several SDKs or calling multiple providers per action.

## Other cloud alternatives reviewed, not selected now

| Platform | Verified free/trial boundary | Why it is not being added now |
| --- | --- | --- |
| AWS / Bedrock candidate | AWS advertises up to $200 in new-customer credits and a Free plan lasting up to six months or credit exhaustion. Most new customers need no payment method, but identity verification may request one. Eligibility and individual model/service availability still need checking. | A finite onboarding offer is not a recurring free generative-media allowance. Another account, IAM and adapter would delay the existing working provider paths. |
| Azure / Microsoft Foundry | The platform is free to explore; consumed features/services have their own rates. Building requires an Azure subscription. Its advertised $200/30-day credit is a trial, not blanket free model inference. | No verified ongoing free allowance for Orbit's selected generative-media tasks; avoid new subscription and deployment work without a specific capability gap. |
| Cerebras | Official rate-limit FAQ requires a verified payment method for $5 trial credits, expiring after 30 days. It explicitly says there is no permanently free recurring tier; API/Playground remain inactive without payment-method setup. | Conflicts with the current no-card preference and duplicates existing text inference. Marketing's shorter account/free-credit description does not override the detailed setup conditions. |
| Cohere | Trial API calls are free/rate-limited, but trial keys are explicitly not permitted for production or commercial purposes. Production keys are pay-as-you-go. | A commercial Orbit app cannot use trial keys as its free production backend. No immediate need to add another text/retrieval provider. |

This is a practical shortlist, not an assertion that every cloud model has been
audited. Revisit an alternative only when it fills a measured capability, quality,
capacity or privacy gap. Do not create accounts or connect billing merely to
collect temporary credits; provider allowances must not become product promises.

## Firebase: capability, cost and setup boundaries

- The no-payment-method route is **Spark + Gemini Developer API**, with no Cloud
  Billing account linked. A trial with credits or a billing-enabled Blaze project
  is not the same as an ongoing no-card free tier. Linking billing makes Gemini
  Developer API usage pay-as-you-go; Google Cloud trial credits cannot pay its
  costs. Agent Platform Gemini API, formerly Vertex AI, requires billing.
- Firebase's current supported-model page lists general text/multimodal models
  without required billing. Image-generating Nano Banana models require billing.
  Image/video/audio *input understanding* must not be advertised as generated
  image/video/audio output.
- The FAQ explicitly excludes Veo, Lyria and Gemini Omni from Firebase AI Logic.
  Direct Gemini API lists generative video/music as paid. Firebase is therefore
  not a free six-second video or free generated-music solution.
- `gemini-3.1-flash-tts-preview` is listed as billing not required: a candidate for
  voiceover, subject to actual project access/quota. TTS is not music synthesis.
- Provider quotas are project-wide across apps/IPs and may return 429. Firebase
  additionally defaults to 100 RPM per user, with one adjustable policy for users;
  this is not a paid-plan entitlement or a guarantee of available capacity.
- App Check is automatically enforced for new setups. **From 2 November 2026,
  enforcement is required.** Web release needs production attestation, not a
  committed debug token. Register the web app and configure reCAPTCHA Enterprise
  and deployment domains before enabling the feature for customers.
- Firebase now provisions a Google-managed service agent for Gemini authorization.
  Its public Firebase config key is not a Gemini server secret. Never expose
  `GEMINI_API_KEY` as `NEXT_PUBLIC_*`, reuse it in client code, or add Generative
  Language API access to the publicly shipped Firebase key.

Model lifecycle matters: Google's current FAQ states `gemini-2.5-flash-image`
shut down on **2 October 2026**. General Gemini 2.5 Developer API models are
deprecated and restricted to previously active projects. Check model availability
when a call fails; do not repeatedly rotate keys or switch to a paid model blindly.
Do not remove a working older model configuration without checking its actual use.

## Privacy and regional limits

Google's unpaid-service terms allow submitted prompts/files/responses to improve
products and permit human review. They instruct against sensitive, confidential
or personal information. The terms also require Paid Services for API clients
made available in the EEA, Switzerland or UK, and restrict availability by region
and age. A free pilot is not automatically suitable for unrestricted worldwide
customer uploads. Review the actual deployment audience before release.

Keep reduced-preview sharing off until the user explicitly chooses it. Do not
send whole originals, access tokens, customer secrets or unrelated project assets
to a model. Preserve explicit unpaid-data acknowledgment. Explain the applicable
data handling where users choose cloud AI, without claiming unsupported privacy.
Evaluate each additional provider's retention, training and licence terms before
uploading customer media. Free inference is not a licence for third-party music.

## Phased implementation and acceptance

| Order | Work | Evidence needed before marking ready |
| --- | --- | --- |
| A | Finish existing Gemini paths: Studio caption/script/rewrite and Image/Video edit proposals | Signed-in request reaches the intended Preview API/model; real output validates; draft save/reload works; Apply/Undo works; stale proposals cannot change replaced media. |
| B | Finish still-image generation/edit journey using the existing Cloudflare account | Confirm Free tier, non-sensitive input, real decodable output visible on canvas, export file opens, undo preserves original and metering is recorded once. |
| C | Add one useful audio capability, preferably transcription or downloadable TTS | Actual speech/audio result, bounded uploads/duration, timed captions or playable audio, import/export acceptance, safe quota/error states. Do not claim transcript accuracy from brief-based copy. |
| D | Consider Firebase Live voice or optional local inference | Spark/no-billing verified, production App Check configured, current model supported, privacy/region decision documented, no subscription bypass through direct client requests. |
| E | Generative video/music | Select a genuinely available provider allowance or explicitly approved budget first; implement durable jobs, ownership, storage and reconciliation before exposing Generate. No free-forever promise from trial credits. |

Keep fixed provider destinations and approved models; the LLM cannot choose an
arbitrary URL/model. Preserve bounded bytes/pixels/tokens, timeouts, validation,
workspace permissions and atomic quotas. Do not retry ambiguous submitted jobs or
silently bill a second provider after 429. Respect existing no-retry/no-fallback
contracts unless a separately reviewed change establishes safe semantics.

Test the changed boundary, not every unrelated completed feature. Fixture tests
prove request/error behavior; real synthetic provider acceptance proves inference;
browser save/apply/export proves the customer workflow. Record those separately.
Preview acceptance does not authorize production promotion or paid activation.

## Primary sources

- https://firebase.google.com/docs/ai-logic
- https://firebase.google.com/docs/ai-logic/pricing
- https://firebase.google.com/docs/ai-logic/models
- https://firebase.google.com/docs/ai-logic/quotas
- https://firebase.google.com/docs/ai-logic/get-started
- https://firebase.google.com/docs/ai-logic/app-check
- https://firebase.google.com/docs/ai-logic/faq-and-troubleshooting
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/terms
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/
- https://developers.cloudflare.com/workers-ai/models/
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/speech-to-text
- https://huggingface.co/docs/inference-providers/pricing
- https://huggingface.co/docs/transformers.js/index
- https://aws.amazon.com/free/free-tier-faqs/
- https://azure.microsoft.com/en-us/pricing/details/microsoft-foundry/
- https://inference-docs.cerebras.ai/support/rate-limits
- https://www.cerebras.ai/inference
- https://cohere.com/pricing

Related repository records: `GEMINI_INTEGRATION.md`,
`CLOUDFLARE_IMAGE_EDITING.md`, `AI_EDITOR_CAPABILITIES.md`,
`AI_PROVIDER_RESEARCH_2026-10-24.md` and `MUSIC_INTEGRATION.md`.

## Implementation delivered in this change

- Authenticated `/ai/status` adds safe model/privacy metadata, keeps `verified: false`, and makes no inference calls.
- Studio shows that metadata and the Gemini unpaid-service notice; bounds briefs to4,000 characters before brand writes; stages the active caption for Rewrite without dispatching or modifying the original draft.
- Image Editor adds **Create from text** when configured Cloudflare status advertises `canGenerate`. It sends only a strict prompt (1–1,500 characters), never the current image. Generated pixels enter the existing editable composition with Undo.
- New authenticated `POST /media/image-edit/generate` uses selected Cloudflare only, existing credentials, role/billing/shared quota checks, a single fixed1024×1024 multipart request, and existing bounded output parsing. No automatic retries or paid-provider fallback.
- The web relay permits only the exact new POST route; unknown suffixes and GET are rejected.
- No Firebase project, billing plan, credentials, existing model selection, subscription entitlement or production promotion is changed. Existing Cloudflare account billing state/remaining daily allowance is not established by a configuration check; zero charge is not guaranteed for billing-enabled accounts.
- Provider-shaped test responses verify integration behavior; they do not establish current live model access. Browser acceptance and deployment results are recorded after verification below.

## Verification for this implementation

- Web, API and AI-package TypeScript checks passed; production Next build passed as part of browser acceptance.
- 108 focused API/provider tests passed together: status/privacy/configuration, shared quota/role controls, Gemini workflow, Cloudflare editing/generation, bounded parsing and private binary response.
- 15 web relay tests passed, including the exact generation POST and denied GET/unknown suffixes.
- 14 browser cases passed across Chromium and WebKit: Studio staged Rewrite/dirty cancellation/explicit dispatch, setup failure disabling AI, bounded briefs, preview isolation, saved destinations, existing pixel edits/Apply/Undo/stale media, and new prompt-only generation/Undo/quota failure.
- The first browser pass exposed a one-unit WebKit RGB decode difference for the green fixture; the new assertion allows at most one unit per channel while still comparing the actual canvas pixels. No application behavior or older test assertion was changed for this adjustment. The complete14-case scope then passed.
- These browser cases intercept provider/workspace responses. They do not establish actual signed-in cloud inference or production quota/billing correctness.
- A separate direct live probe was attempted through `vercel env run` with the existing Preview settings. Vercel correctly withheld sensitive Preview secrets, so the script stopped at its credential precondition before inference; no model request was made. Do not weaken secret classification, expose keys or ask for key re-entry to bypass this. A signed-in deployed flow is the remaining acceptance path.
- Configuration metadata confirms the selected feature Preview uses Gemini3.5Flash-Lite text with existing admin consent and a separate Cloudflare image route; presence/configuration is not live inference verification. Production provider selection was not decrypted or changed.

## Deployed Preview transport blocker and prepared repair

An unauthenticated transport check of the feature API `/v1/health` returned302
with the Vercel authentication wall; the production API returned200 JSON. These
public health checks made no AI request. The web relay previously sent only the
Supabase workspace identity, so a protected API Preview could reject the call
before Orbit authentication or inference. Vercel login in the user's browser does
not authenticate a separate server-to-server fetch.

The prepared repair uses `@vercel/oidc`4.0.3 to read the current function identity
on each hosted request and forward `x-vercel-trusted-oidc-idp-token` only to the
fixed configured `.vercel.app` API origin. The Supabase bearer/workspace checks
remain independent. User-provided platform headers are never forwarded, tokens
are not cached/logged/returned, redirects remain blocked, and custom non-Vercel
origins receive no platform token.

For this protected two-project setup, the target API also needs an explicit
Trusted Source. Configuration has **not** been changed by this patch:

1. Vercel project **orbit-ai-studio-api → Settings → Deployment Protection**.
2. **Trusted Sources → Vercel Projects → Add** (or inspect/edit the existing Orbit web entry).
3. Select **orbit-ai-studio** in team **ahmadfaizyaakop-7657s-projects**.
4. Allow only **from Preview → to Preview** for this acceptance. Remove other prefilled environment pairs from a new entry; do not alter API self-access or unrelated existing rules. Do not add Preview→Production.
5. Save. In **orbit-ai-studio → Settings → Security**, confirm **Secure Backend Access with OIDC Federation** is enabled if the runtime reports no platform token.
6. Retry the signed-in Preview flow. A backend401 for an invalid Supabase token is different from a Vercel protection302; neither should be reported as successful inference.

Do not disable Deployment Protection or distribute a long-lived bypass secret.
Reference: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources

OIDC repair validation:24 relay tests passed, including new fresh-token,
user-header isolation, non-Vercel destination, missing-token and pre-auth/size
cases. A frozen offline install on DESKTOP-ALBAB, web TypeScript and production
Next build passed with the declared dependency. The earlier15-relay-test total
is superseded by24 (108 API/provider +24 relay =132 focused unit tests); the14
browser cases remain the UI acceptance scope. Trusted Sources membership and a
real signed-in inference request remain separate deployed acceptance conditions.

## Follow-up: Trusted Sources repaired

After the owner's confirmation, a direct settings read established that the
Preview→Preview rule had been saved on the web project's self-access entry; the
API project had no Trusted Sources entry. Both projects had OIDC enabled. Using
the already-authorized project/environment pair, the API was updated to trust
only `orbit-ai-studio` Preview→Preview. Existing web self-access was left alone.
No production or cross-environment access was added.

Readback confirmed the exact API rule. The deployed web relay then returned401
`Invalid or expired identity` for an intentionally invalid Supabase token,
replacing the earlier protection-redirect502. This proves the request reaches
Orbit authentication while preserving rejection of invalid users; it is not
successful authenticated inference.

A Preview-only focused probe scope is available through the existing disabled
build-probe switch. `studio-and-generation` runs only one public-synthetic Gemini
Studio request and one Cloudflare prompt-only image request, with no original
upload, database write, provider fallback or output/key logging. It requires both
selected providers and the Gemini data-policy opt-in before loading providers.
Eleven release/probe guard tests passed. The switch must be restored to its
original `false` immediately after this bounded acceptance run.
