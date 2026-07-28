# Orbit Social automation workflow

## Production workflow

1. A weekly BullMQ job selects approved campaign themes and checks workspace AI budget.
2. One batched AI request generates copy for Facebook, Instagram, Threads, and TikTok plus a short-video production brief.
3. The compliance pass flags unsupported wellness claims, missing disclosures, duplicate copy, and absent calls to action.
4. The workspace owner reviews and edits every draft. Health and wellness content cannot bypass approval by default.
5. Approved content becomes scheduled platform jobs with idempotency keys, retries, rate-limit handling, and connector-specific formatting.
6. Every call to action uses Orbit's `/go/myshop` redirect, which centralizes the destination without hard-coding the retailer URL into every campaign.
7. Publishing results and platform post IDs are stored. Failed jobs enter a retry/dead-letter path and notify the owner.
8. After 24 and 72 hours, analytics jobs collect reach, engagement, clicks, and publishing failures.
9. The next weekly plan uses those results to recommend new hooks and formats; it does not automatically make health claims or increase budget.

## Activation gates

- Production HTTPS web and API domains
- Connected social accounts with approved publishing permissions
- Encrypted OAuth token storage and refresh/revocation handling
- Redis worker running continuously
- OpenAI workspace budget configured
- Successful sandbox and owner-approved test post
- Privacy, terms, data-deletion, and disclosure pages

Until every gate passes, keep `SOCIAL_CONNECTOR_MODE=mock`. The Automation screen is a safe preview of the intended production workflow.
