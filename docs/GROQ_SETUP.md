# Temporary Groq testing setup

Groq powers Studio text (caption, ideas, rewrite, hashtags, scripts) and brief-based video plans. It does not replace the separate HF/fal-ai image editor or generate video footage. Existing workspace authentication, membership, billing gate and shared monthly attempt quota still apply. No automatic fallback to HF or another provider occurs when Groq is explicitly selected.

## Operator setup

1. Create an API key at https://console.groq.com/keys, with a name such as `Orbit-Testing`. Keep the account on the intended Free plan for free-tier testing.
2. Open the existing Vercel **orbit-ai-studio-api** project, Settings, Environment Variables. Select Production and add:

| Name | Value | Setting |
| --- | --- | --- |
| `AI_TEXT_PROVIDER` | `groq` | Server configuration |
| `GROQ_API_KEY` | The new Groq key | Sensitive secret |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Optional; this is the code default |

3. Save and redeploy the backend with the new environment variables. Use separate credentials for Preview if testing that environment.
4. Sign in to Orbit and generate one short test caption in `Orbit Verification`. Confirm the draft is saved and can be reopened. Then test a brief-only video plan.

Keep `HF_TOKEN` in its own variable if retaining image editing. Never put a Groq key into `HF_TOKEN` or a `NEXT_PUBLIC_*` variable. The frontend needs no provider key. No OpenAI API key is required to use a model hosted by Groq. Existing image billing/credits remain separate.

The app's setup endpoint reports configured provider metadata only, not successful inference or available free-plan allowance. Groq may return 429 when the account's model limits are reached. An attempted API call remains counted by the existing Orbit workspace attempt quota, including failed dispatched requests. Do not enable paid fallback or auto-recharge as part of this setup.

## Verification boundary

Provider-shaped test fixtures verify fixed endpoint/key routing, separate caches, parsed output, persisted drafts, quota enforcement and Groq video planning without an HF token. They do not prove the operator's Groq key or free-plan access works. Live acceptance requires the operator to save the actual key in Vercel and deploy the new environment.

Official references: https://console.groq.com/docs/quickstart, https://console.groq.com/docs/openai, https://console.groq.com/docs/rate-limits.
