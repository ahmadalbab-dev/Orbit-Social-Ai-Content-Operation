# Orbit Social project wiki

This file is the project-scoped source of truth assembled from the Orbit Social work in this Codex task. It intentionally excludes passwords, app secrets, tokens, one-time codes, recovery codes, private browser content, and unrelated conversations.

## Product

- Name: Orbit Social
- Purpose: multi-tenant AI-assisted social content creation, approval, scheduling, publishing, analytics, and workflow automation.
- Local web: `http://localhost:3000`
- Local API: `http://localhost:3001/v1`
- Repository: [ahmadalbab-dev/Orbit-Social-Ai-Content-Operation](https://github.com/ahmadalbab-dev/Orbit-Social-Ai-Content-Operation)
- Store destination: [4Life Malaysia product catalogue](https://malaysia.4life.com/corp/shop/all)
- Tracked local store route: `http://localhost:3000/go/myshop`
- Support email: `ahmadalbab.dev@gmail.com`

## Brand and accounts

- Facebook profile reference: `original.ahmadalbab`
- Facebook Page: `4life Malaysia`
- Instagram account: Creator, linked to the Facebook Page
- Threads profile: [@my4life.malaysia](https://www.threads.com/@my4life.malaysia)
- TikTok App ID: `7667346986623223828`
- Meta app mode: Development
- Meta App ID and TikTok Client Key are stored only in the Git-excluded `My SOCMED` vault.
- Threads profile URL is not a Threads App ID. The Threads App ID remains pending in Meta Developer.
- TikTok review is not submitted because public legal and callback URLs require deployment first.

## Public application routes

- `/privacy` — Privacy Policy
- `/terms` — Terms of Use
- `/data-deletion` — user-facing deletion instructions
- `/go/myshop` — centralized redirect to the 4Life Malaysia store
- `/manifest.webmanifest` — installable web-app metadata

After deployment, use the production versions of the first three URLs in Meta and TikTok developer forms.

## Supported channels

- Facebook
- Instagram
- Threads
- TikTok
- LinkedIn
- YouTube
- X
- Pinterest

Facebook, Instagram, Threads, and TikTok are exposed in the first operational UI. All connectors remain in mock mode until OAuth, review, and sandbox tests pass.

## Automation workflow

1. Plan weekly education, FAQ, routine, and product-information themes.
2. Generate one batched campaign for Facebook, Instagram, Threads, and TikTok.
3. Produce a short-video brief with hook, shot list, voiceover, captions, and visual prompts.
4. Run wellness-claim and duplicate-content checks.
5. Require owner approval.
6. Schedule platform-specific jobs with idempotency, retries, and rate-limit handling.
7. Publish through authorized connectors and route calls to action through `/go/myshop`.
8. Collect analytics after 24 and 72 hours.
9. Recommend the next variations without bypassing approval or budget limits.

See [docs/AUTOMATION_WORKFLOW.md](docs/AUTOMATION_WORKFLOW.md) and [docs/4LIFE_CONTENT_PLAYBOOK.md](docs/4LIFE_CONTENT_PLAYBOOK.md).

## Security rules

- Never request or store social-media passwords.
- Use official OAuth consent screens.
- Never put secrets in Git, chat, screenshots, logs, documentation, or frontend environment variables.
- Store local integration credentials in `My SOCMED/social-connections.env`.
- Use the deployment provider's encrypted secret manager in production.
- Encrypt OAuth tokens at rest and implement state validation, refresh, revocation, and audit logging.
- Keep `SOCIAL_CONNECTOR_MODE=mock` until production gates pass.

## Production gates

- Public HTTPS web and API domains
- Privacy, Terms, and Data Deletion URLs
- Signed Meta data-deletion callback and status endpoint
- Meta app configuration, business verification, permission review, and tester authorization
- TikTok Login Kit and Content Posting API configuration and review
- Encrypted token storage and production secret management
- Continuous API and Redis/BullMQ worker hosting
- Database migrations, backups, monitoring, and alerting
- Successful sandbox publishing on every connected channel

## Official references

### Design

- [Figma: web design trends](https://www.figma.com/resource-library/web-design-trends/)
- [Figma: skeuomorphism](https://www.figma.com/resource-library/what-is-skeuomorphism/)

### Meta

- [Meta developer apps](https://developers.facebook.com/apps/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Facebook Pages API](https://developers.facebook.com/docs/pages-api/)
- [Threads API](https://developers.facebook.com/docs/threads/)
- [Threads getting started](https://developers.facebook.com/docs/threads/get-started/)

### TikTok

- [TikTok Developer Portal](https://developers.tiktok.com/)
- [Login Kit](https://developers.tiktok.com/doc/login-kit-overview)
- [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started/)

### Other social APIs

- [YouTube Data API: upload videos](https://developers.google.com/youtube/v3/docs/videos/insert)
- [LinkedIn Posts API](https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api)
- [X API: create a post](https://docs.x.com/x-api/posts/create-post)
- [Pinterest API: create a Pin](https://developers.pinterest.com/docs/api/v5/pins-create)

### Application services

- [OpenAI API documentation](https://platform.openai.com/docs/)
- [Supabase documentation](https://supabase.com/docs)
- [Authentication status and remaining requirements](./docs/AUTHENTICATION_STATUS.md)
- [BullMQ documentation](https://docs.bullmq.io/)
- [n8n documentation](https://docs.n8n.io/)
- [Netlify documentation](https://docs.netlify.com/)

## Knowledge-capture boundary

This wiki may be extended with links and text explicitly provided for this project. Orbit Social does not automatically read unrelated browser tabs, private chats, email, or other applications. Attach or paste specific material when it should be included.
