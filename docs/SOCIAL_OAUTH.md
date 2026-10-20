# OAuth connection operations

This guide covers account connection only. Publishing remains off; no billing or production change is required to validate this code.

## Request flow

1. The authenticated web route receives an Owner/Admin's same-origin POST for `facebook`, `instagram` or `threads`. It generates a cryptographically random 32-byte base64url browser nonce (43 characters), retains it in a secure HttpOnly callback cookie and forwards it to API `POST /v1/integrations/oauth/:provider/start` as `x-orbit-oauth-browser`. The API requires an empty JSON object and the existing verified workspace identity.
2. The API stores only SHA-256 hashes of OAuth state and browser nonce, together with the initiating workspace/user/provider and a 600-second expiry. It returns a provider authorization URL plus expiry.
3. The provider redirects the browser to the exact registered web GET callback, `/api/social-oauth/meta/callback` or `/api/social-oauth/threads/callback`. The web server forwards state, code or denial, and the HttpOnly browser cookie value to the API. Tokens and app secrets stay on the server.
4. Public API `POST /v1/oauth/:route/callback` accepts only `{state, code?, error?, browserNonce}`. It requires matching hashed state/browser, unexpired unused state and matching app family. It atomically consumes state before exchange and rechecks current workspace Owner/Admin membership before exchange and again in the token-storage transaction. Neither a callback workspace ID nor the browser's active workspace selects the destination.
5. Successful grant inspection/discovery upserts accounts only in the original workspace, encrypts access tokens using AES-256-GCM with AAD `workspaceId:PLATFORM:externalAccountId`, and writes a connection audit record. Any transaction failure rolls back account/token/audit writes. Provider response details are not returned or logged by the service.
6. Authenticated `GET /v1/integrations/status` reads only the current workspace's database records. It reports configuration readiness, required-scope and expiry checks, stored granted scopes, expiry and reconnect requirements, with `livePublishing:false`. Configuration readiness is not evidence of a completed provider consent.

All provider requests use fixed Meta hosts, 15-second abort timeouts, no redirects and a 512 KiB streamed response limit. Page discovery follows only bounded cursor values on a fixed host; supplied `paging.next` URLs are never fetched. Discovery stops after five pages. Unknown expiry, invalid app binding, missing scopes, empty account discovery, malformed JSON and provider errors fail closed. Callback state is single-use even after failure; retry by starting another connection.

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
