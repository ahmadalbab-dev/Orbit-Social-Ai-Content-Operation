# Orbit identity staging

Reviewed 17 October 2026. API/database and web public configuration are deployed; first real-user acceptance remains pending.

## Confirmed resources

- Organisation: ORBIT (`rjxhuiwfyxcbejkchmwy`), renamed by Albab from MD Tech after project creation. The organisation and project IDs did not change.
- Supabase project: `orbit-ai-studio`, ref `lgzyvgmuyrnpwccviqgq`.
- Region: Singapore, `ap-southeast-1`.
- URL: `https://lgzyvgmuyrnpwccviqgq.supabase.co`.
- Provider quoted project cost: USD0/month at creation. This is not a promise of unlimited free usage or free future paid services.
- Project status and a read-only database query passed. Five tracked Prisma migrations have been applied; 23 application tables and migration history have RLS and no browser table access. StockPilot is a different project and was not changed.

## Activation order

1. Deploy the existing NestJS API on a compatible persistent Node/container host. Keep the FFmpeg worker and shared private media volume separate from Vercel frontend functions. Host choice/access is still required.
2. Configure the API database connection securely in the host's secret manager. Never commit connection passwords or service-role keys. Run the existing Prisma migrations through the operator migration job, once. Do not independently apply the same SQL through Supabase and leave Prisma history unsynchronised.
3. Before migration, choose a private application schema outside the Supabase Data API, or explicitly revoke `anon`/`authenticated` table access and enable RLS on public application tables in the same migration transaction. Orbit accesses its database through its authenticated API, not direct browser table grants. Verify advisors and cross-tenant denial before adding data.
4. API identity configuration:
   - `AUTH_JWT_ISSUER=https://lgzyvgmuyrnpwccviqgq.supabase.co/auth/v1`
   - `AUTH_JWT_AUDIENCE=authenticated`
   - `AUTH_JWKS_URL=https://lgzyvgmuyrnpwccviqgq.supabase.co/auth/v1/.well-known/jwks.json`
   - `DEV_AUTH_ENABLED=false`
   - `WEB_URL=https://orbit-ai-studio-two.vercel.app`
5. Set the Supabase Site URL to the exact web origin above. Configure email confirmation and a tested SMTP sender. Recovery email must include `{{ .Token }}` as a code; this UI does not consume link/hash callbacks. Preserve provider rate limits, expiry and reuse detection.
6. Only after the API is reachable, set the three public Vercel build variables: `NEXT_PUBLIC_API_URL` (actual HTTPS API origin), `NEXT_PUBLIC_SUPABASE_URL` (project URL), and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (enabled publishable key). Rebuild the web app. No backend secret gets a `NEXT_PUBLIC_` name.
7. Test real signup/confirmation, sign-in, two isolated workspaces, save/reload, expiry/refresh, sign-out during pending requests, wrong/expired recovery codes, successful password reset, old-password rejection and phone resume. Recovery sends email only when the user explicitly submits the recovery form.

## Session behavior

Tokens stay in memory, not localStorage, sessionStorage, URLs or logs. Reloading/restarting requires sign-in. Refresh requests are serialized; a signed-out or unmounted app ignores late replies. Renewal updates the API identity without remounting the editor. If renewal fails, local access ends and the user must sign in again. Existing server JWT validation and workspace membership checks remain authoritative.

Password recovery creates a temporary provider session solely to update the password and attempts local revocation in `finally`. It does not install an Orbit workspace session. Provider errors are replaced with safe messages.

## Next providers

Configure HF token/model server-side only after identity and workspace persistence work. Measure a real generation against quotas. Stripe stays in sandbox and social publishing stays off until their individual acceptance tests and user approvals are complete.
