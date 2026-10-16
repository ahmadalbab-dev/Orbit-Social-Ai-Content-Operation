# Orbit v1 on Vercel

Vercel hosts the Next.js web application for design and browser testing. Cloudflare remains the chosen future domain/security layer. Neither Cloudflare protection nor a live full-stack deployment is implied by this configuration.

## Confirmed target and current blocker

- Vercel team: `ahmadfaizyaakop-7657s-projects` (`team_No5PjqwSgoX8ip61SmGkMJya`).
- Intended new project: `orbit-social-v1`.
- Repository: `ahmadalbab-dev/Orbit-Social-Ai-Content-Operation`.
- Testing branch: `feature/commercial-foundation`; do not accidentally release the older `main` app.
- The connected Vercel API returned **403 forbidden** when creating this project. No project/deployment was created. The local CLI has no authentication fallback.
- An account/team administrator must create/import the project, or enable project creation for this connection. Never send a Vercel token in chat.

## Dashboard import

1. Open [Vercel New Project](https://vercel.com/new) under the team above. Import the existing GitHub repository, without copying it to another repository.
2. Set Project Name to `orbit-social-v1`, Framework to **Next.js**, and Root Directory to **apps/web**. Include source files outside the root directory so workspace dependencies can be traced.
3. Build configuration is committed in `apps/web/vercel.json`:
   - Install: `pnpm install --frozen-lockfile`
   - Build: `cd ../.. && pnpm exec turbo run build --filter=@sma/web...`
   - Output: leave the Next.js default; do not set `out` or `dist`.
   - Node: **22.x**, matching CI; use the repository-pinned pnpm version.
4. Deploy the testing branch **feature/commercial-foundation**, not an unreviewed or older main revision. If import defaults to main, change the project's Git production branch to the testing branch or create an explicit preview deployment from that branch before evaluating the app.
5. Keep deployment protection enabled. Once the project exists, the deployment must be inspected for the exact intended commit and reach READY before sharing its real URL.

No production database or Stripe/Hugging Face secret is needed for the design preview. No fake backend URL should be supplied.

## Browser entry points

- `/`: normal workspace sign-in. Until identity and backend are configured, it explains that setup is pending and links to the preview.
- `/preview`: explicit design preview using the existing Orbit components. Test all navigation, Light/Dark appearance, motion, local image editing/export and local video previews.
- Preview skips workspace/AI/media status fetching and hides billing management. Backend-dependent actions stay unavailable. No demo identity, token, populated account connection or paid entitlement is created.
- Files chosen for local editors remain in the browser. Server upload/render, AI generation, saved drafts, social authorization and subscriptions require authenticated backend setup. Video preview is not an exported server render.
- `/preview` has noindex metadata; it is not a customer signup or a production workspace.

## Enable full-stack testing later

Configure an Orbit-specific identity/database and deploy the API to a persistent host. The current video API/FFmpeg worker share a private media volume and cannot simply run as independent ephemeral Vercel functions. Keep media rendering disabled until the worker and private storage exist.

Then configure these public web build variables, and rebuild:

| Variable | Value source |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Actual HTTPS Orbit API origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Orbit identity project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Its public publishable/anon key |

Configure matching JWT issuer/audience/JWKS, database and trusted WEB_URL on the API. HF keys, Stripe keys, webhook secrets and OAuth secrets belong only on the API server. Never use NEXT_PUBLIC names for them. Existing private Sites OAuth is separate and must not be silently reused with incompatible commercial routes.

Before inviting testers, verify real sign-in and workspace isolation, save/reload drafts, provider-backed AI, signed Stripe sandbox delivery, private media paths, errors and Safari. Git pushes can create Vercel previews after the Git connection is enabled; those builds do not replace the existing GitHub test/security checks.

## Cloudflare phase

No domain has been supplied. Start with the assigned Vercel URL. Connect the chosen custom domain through Cloudflare DNS after it exists, verify HTTPS and routing, and configure security rules deliberately. A DNS record alone does not prove traffic is proxied through Cloudflare or protected by its WAF. Keep Vercel protection active until the public beta release is approved.
