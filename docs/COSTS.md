# Cost controls and MVP estimate

## Controls

- Default to the cheapest capable text model; escalate only when quality evaluation fails.
- Hash normalized requests, cache outputs, batch platforms in one structured request, cap output at 1,200 tokens.
- Hard workspace monthly budgets; meter tokens and estimated USD per request.
- Queue provider calls, deduplicate publish jobs, and use exponential retries only for transient errors.
- Keep mock publishing enabled until platform credentials are approved.

## Monthly estimate

Estimate as of July 2026; vendor pricing and free-tier eligibility can change.

- Development/local: USD 0 plus OpenAI usage.
- Small MVP on free tiers: USD 0–15 infrastructure + roughly USD 1–20 AI usage.
- More reliable small production: USD 15–45 infrastructure + usage.

Domain registration, platform-specific paid API access, email/SMS, heavy media processing, and high storage/egress are excluded.
