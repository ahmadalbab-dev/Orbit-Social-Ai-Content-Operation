# Local Groq testing setup

Groq powers Studio text (caption, ideas, rewrite, hashtags, scripts) and brief-based video plans. It does not replace the separate HF/fal-ai image editor or generate video footage. Existing workspace authentication, membership, billing gate and shared monthly attempt quota still apply. No automatic fallback to HF or another provider occurs when Groq is explicitly selected.

## Operator setup

1. Create an API key at https://console.groq.com/keys, with a name such as `Orbit-Testing`. Keep the account on the intended Free plan for free-tier testing.
2. In an isolated local checkout, add the following to a private root `.env` or the API process environment. Do not change Vercel, production or existing runtime environments:

| Name | Value | Setting |
| --- | --- | --- |
| `AI_TEXT_PROVIDER` | `groq` | Server configuration |
| `GROQ_API_KEY` | The new Groq key | Sensitive secret |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Optional; this is the code default |

3. Keep `BILLING_ENABLED=false`, `SOCIAL_CONNECTOR_MODE=mock`, and `MEDIA_RENDER_ENABLED=false`. Use a disposable local database and localhost web/API URLs. No provider upgrade or auto-recharge is part of this setup. Application flags do not control the Groq account's billing plan.
4. Start local processes and sign in to a test workspace. Generate one short caption, save it, reload it and verify it belongs to the same workspace. Then test a brief-only video plan. Generative image calls require their own configured provider; a Groq text key does not enable image generation.

Keep `HF_TOKEN` in its own variable if retaining image editing. Never put a Groq key into `HF_TOKEN` or a `NEXT_PUBLIC_*` variable. The frontend needs no provider key. No OpenAI API key is required to use a model hosted by Groq. Existing image billing/credits remain separate.

The app's setup endpoint reports configured provider metadata only, not successful inference or available free-plan allowance. Groq may return 429 when the account's model limits are reached. An attempted API call remains counted by the existing Orbit workspace attempt quota, including failed dispatched requests. Do not enable paid fallback or auto-recharge as part of this setup.

## Verification boundary

Provider-shaped fixtures verify fixed endpoint/key routing, separate caches, parsed output, draft-service writes, quota enforcement and video planning without an HF token. They do not prove key validity, free-plan allowance, real database persistence or output quality. Real Groq acceptance can run locally with a privately configured key; deployment is unnecessary.

The default remains `openai/gpt-oss-20b`. Groq accepts syntactically namespaced or bare model identifiers; Hugging Face retains its namespaced requirement. Account access and model availability still require verification. Provider endpoints stay fixed. No SDK or lockfile change is needed.

Rollback: restore the previous local `AI_TEXT_PROVIDER` and restart the API. If selection was automatic, leave the variable absent rather than empty. Keep HF image credentials separate. Removing a Groq key deliberately reports unconfigured and does not trigger fallback.

Official references: https://console.groq.com/docs/quickstart, https://console.groq.com/docs/openai, https://console.groq.com/docs/rate-limits.
