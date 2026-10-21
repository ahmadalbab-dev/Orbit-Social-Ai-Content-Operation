# OAuth connection operations

This guide covers account connection only. Publishing remains off; no billing or production change is required to validate this code.

Direct Instagram Login for Business/Creator accounts without a Facebook Page is a separate Meta-supported option. It is not implemented here: the exact code-exchange, granted-scope, expiry and app-binding verification contract could not be fully retrieved from primary documentation during this review. Do not substitute the Facebook token-inspection contract or present direct Instagram Login as enabled. The existing Instagram connection remains the tested Facebook-linked flow. Reference: https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login

## Request flow

1. The authenticated web route receives an Owner/Admin's same-origin POST for `facebook`, `instagram`, `threads` or `tiktok`. It generates a cryptographically random 32-byte base64url browser nonce (43 characters), retains it in a secure HttpOnly callback cookie and forwards it to API `POST /v1/integrations/oauth/:provider/start` as `x-orbit-oauth-browser`. The API requires an empty JSON object and the existing verified workspace identity.
2. The API stores only SHA-256 hashes of OAuth state and browser nonce, together with the initiating workspace/user/provider and a 600-second expiry. It returns a provider authorization URL plus expiry.
3. The provider redirects the browser to the exact registered web GET callback, `/api/social-oauth/meta/callback`, `/api/social-oauth/threads/callback` or `/api/social-oauth/tiktok/callback`. The web server forwards state, code or denial, and the HttpOnly browser cookie value to the API. Tokens and app secrets stay on the server.
4. Public API `POST /v1/oauth/:route/callback` accepts only `{state, code?, error?, browserNonce}`. It requires matching hashed state/browser, unexpired unused state and matching app family. It atomically consumes state before exchange and rechecks current workspace Owner/Admin membership before exchange and again in the token-storage transaction. Neither a callback workspace ID nor the browser's active workspace selects the destination.
5. Successful grant inspection/discovery upserts accounts only in the original workspace, encrypts access tokens using AES-256-GCM with AAD `workspaceId:PLATFORM:externalAccountId`, and writes a connection audit record. Any transaction failure rolls back account/token/audit writes. Provider response details are not returned or logged by the service.
6. Authenticated `GET /v1/integrations/status` reads only the current workspace's database records. It reports configuration readiness, required-scope and expiry checks, stored granted scopes, expiry and reconnect requirements, with `livePublishing:false`. Configuration readiness is not evidence of a completed provider consent.

All provider requests use fixed Meta or TikTok hosts, 15-second abort timeouts, no redirects and a 512 KiB streamed response limit. Page discovery follows only bounded cursor values on a fixed host; supplied `paging.next` URLs are never fetched. Discovery stops after five pages. Unknown expiry, invalid app binding, missing scopes, empty account discovery, malformed JSON and provider errors fail closed. Callback state is single-use even after failure; retry by starting another connection.

OAuth provider error messages, codes, tokens, state and callback query strings must be excluded from reverse-proxy/access logs and monitoring payloads as part of deployment configuration. `/debug_token` includes a sensitive `input_token` query parameter, and Threads authenticated requests use the documented `access_token` query parameter; do not capture outbound URLs in tracing. Expired/consumed state rows may be removed periodically after the retention period chosen by operators.

## Local verification

Run from `apps/api` with the installed repository dependencies:

```sh
node ../../node_modules/vitest/vitest.mjs run src/social-oauth.service.test.ts
node ../../node_modules/typescript/bin/tsc --noEmit
```

Tests use in-memory database fakes and mocked `fetch`. They make no live consent, paid provider call or production change. Transaction rollback still relies on Prisma's real transaction semantics; run existing database integration checks against an explicitly configured test database when available.

## Controlled consent smoke test (requires owner app setup)

1. Configure the exact HTTPS web/API origins, callback variables, dedicated encryption key and Meta/Threads app credentials from [Meta setup](META_SOCIAL_SETUP.md). Apply repository database migrations to the test database. Keep publishing in mock mode.
2. Log in as an Owner/Admin in a test workspace, start one connection in Channels, and complete consent using an approved developer/test account. Check the expected Page, linked Instagram professional account or Threads profile appears only in that workspace.
3. Inspect status: configuration true, account connected, actual granted scopes and a provider-derived future expiry; no token is present in the response. Confirm the database contains ciphertext and a connection audit entry without credential values.
4. Deny consent on another attempt. Reopening that callback, changing state, using another browser, or switching Meta/Threads callback family must not create tokens. Remove workspace admin access after start to check the callback cannot store a token.
5. Reconnect through Channels to replace an expired or revoked grant. No automatic refresh or publishing should be expected. Real provider expiry/revocation and approved permissions remain app-specific release checks.

Do not claim this test passed until a real authorized app/test account has completed it. Missing app configuration, migrations, approval or credentials should appear as a concrete setup blocker, never as a connected account.


## TikTok Login Kit: owner setup and limits

The TikTok channel connects a profile with `user.info.basic` only. It does not upload, publish, schedule publication, list private content, or provide analytics. The button opens official TikTok consent; customers never enter TikTok passwords into Orbit. Device Share remains a separate manual handoff without an account connection.

### Configure a sandbox first

1. Sign in at https://developers.tiktok.com/ and open **Manage apps → Connect an app** (or select the existing Orbit app).
2. Switch the app to **Sandbox**, create a named sandbox, select the **Web** platform, and enter the Orbit website URL.
3. Add **Login Kit** and the minimum `user.info.basic` scope. In Login Kit Web configuration register this exact static HTTPS redirect URI:
   `https://orbit-ai-studio-two.vercel.app/api/social-oauth/tiktok/callback`
4. Click **Apply changes**. In **Sandbox settings → Target users → Add account**, sign into the TikTok account on TikTok and approve its developer terms. Target-user changes can take up to an hour. TikTok permits up to ten owned target accounts in a sandbox.
5. In the API deployment's server-only environment configure `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and `TIKTOK_REDIRECT_URI` (the exact URI above). Use that sandbox's credential pair, not another app/environment's credentials. Also configure the existing `WEB_URL`, `API_URL`, and `TOKEN_ENCRYPTION_KEY`; no Meta API version is required for TikTok. Do not expose secrets using `NEXT_PUBLIC_` or paste secrets into chat. Apply the existing OAuth state database migration and redeploy the API after environment changes.
6. Sign into Orbit as workspace Owner/Admin. Open **Channels → TikTok → Continue with TikTok**, complete official login/consent, and check that the returned status confirms the expected profile in the initiating workspace. Consent denial must leave existing connections unchanged.

### Production review

Before customers outside the sandbox can connect, complete TikTok app review. The official requirements include a developed public website rather than only a landing/login page; active, visibly accessible Privacy Policy and Terms of Service links; URL ownership verification; a scope/product explanation; and an end-to-end demo recording using the sandbox for a first review. This is operator setup plus platform approval, not a customer-facing API-key task. Do not register Content Posting scopes for this read-only integration.

### Token handling and expiry

The server exchanges a newly issued code with the fixed `https://open.tiktokapis.com/v2/oauth/token/` endpoint using its own client key/secret. It validates `Bearer`, nonempty bounded token/open ID, granted basic scope, and a positive integral `expires_in` of at most the documented 24 hours. It fetches only `open_id,display_name` from the fixed `/v2/user/info/` endpoint and requires that ID to match the exchange. TikTok's success envelope can include `error:{code:"ok"}`; other error codes fail closed. It never applies Meta's numeric-ID or `/debug_token` assumptions to TikTok.

Access tokens are encrypted with workspace/account AAD. Returned refresh credentials are deliberately discarded because automatic refresh is not implemented. Once the saved access expiry is reached, status becomes reconnect-required; use **Reconnect TikTok** for another consent/code exchange. Expiry is at most 24 hours, not an enduring connection. Live publishing stays off. Disconnect/revoke UI is not implemented; users can remove the grant in TikTok's app permission settings. Do not claim ongoing background refresh or completed provider consent until observed.

Verified primary references (20 October 2026; referenced TikTok docs updated 4 August 2026):
- https://developers.tiktok.com/docs/en/login-kit-web
- https://developers.tiktok.com/docs/en/oauth-user-access-token-management
- https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info
- https://developers.tiktok.com/docs/en/add-a-sandbox
- https://developers.tiktok.com/docs/en/getting-started-create-an-app
- https://developers.tiktok.com/docs/en/app-review-guidelines
