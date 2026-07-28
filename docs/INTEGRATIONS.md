# Social integration checklist

Mock mode needs no external account. Live publishing requires platform review and OAuth credentials stored only in the backend secret manager.

| Platform | Official starting point | Typical approval |
|---|---|---|
| Facebook / Instagram | https://developers.facebook.com/docs/instagram-platform/content-publishing | Meta developer app, Business verification, permissions review |
| Threads | https://developers.facebook.com/docs/threads | Threads API configuration, tester authorization, permissions review |
| LinkedIn | https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api | LinkedIn developer app and approved products |
| TikTok | https://developers.tiktok.com/products/content-posting-api | TikTok developer app and Content Posting review |
| YouTube | https://developers.google.com/youtube/v3/docs/videos/insert | Google Cloud OAuth consent, YouTube Data API; unverified upload projects may be private |
| X | https://docs.x.com/x-api/posts/create-post | X developer project and a plan with write access |
| Pinterest | https://developers.pinterest.com/docs/api/v5/pins-create | Pinterest app and approved scopes |

For each provider collect: client ID, client secret, exact callback URL, scopes, sandbox/test account, privacy policy URL, terms URL, and review evidence. Do not paste secrets into chat.

Follow the detailed [Meta and TikTok setup guide](./META_SOCIAL_SETUP.md) for Orbit's callback URLs, safe activation order, and credential placement.

## n8n

Set `N8N_WEBHOOK_URL` only after creating a signed inbound workflow. Use n8n for notifications and peripheral automation; do not duplicate the scheduler or publishing state machine.
