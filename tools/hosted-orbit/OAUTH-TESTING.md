# Orbit private OAuth test backend

This deployment preserves the existing owner-private Orbit Site and its URL. The studio still uses device-local drafts and simulated publishing. Server routes now support Meta (Facebook Login, linked Instagram professional account) and Threads account authorization. No live publishing endpoint is enabled.

## Owner setup

Open `/connect` after signing in with ChatGPT. Registered application IDs are supplied by the owner: Meta `1417185153870513`; Threads `4616718558599009`. Register the displayed callback URLs in the matching Meta/Threads app, add the appropriate app roles/testers, and accept required tester invitations. Supply each matching App Secret only through the private password input on this page. The secrets are stored encrypted in D1; they are never shown again. This replaces the earlier reserved Nest callback URLs for this hosted test deployment.

- Meta: `https://orbit-mobile-albab-preview.airy-kiwi-2012.chatgpt.site/api/social/meta/callback`
- Threads: `https://orbit-mobile-albab-preview.airy-kiwi-2012.chatgpt.site/api/social/threads/callback`

Runtime environment includes app IDs, origin, Graph API version and a randomly generated 32-byte encryption key. Key bytes never belong in Git. Configure this key once; rotating it requires re-encrypting existing records or reconnecting accounts. App credentials and social tokens use AES-GCM with owner/provider/account-bound authenticated context. OAuth state is random, stored as a hash, bound to the authenticated user and a Secure/HttpOnly/SameSite=Lax cookie, expires in ten minutes, and is consumed atomically once before code exchange. Mutations reject a different Origin and bound their request bodies. Provider HTTP errors return generic messages; tokens and app secrets are not returned to the UI.

Account discovery imports up to 25 authorized Facebook Pages with linked Instagram accounts; usernames and Instagram account type are read from the provider. Threads uses PROFILE, without guessing Business/Creator. Status responses omit ciphertext and tokens and report only unexpired stored authorization. Removing a local connection deletes its token; remove app access in Meta/Threads settings to revoke the provider grant too. Automatic refresh/revocation webhooks are not implemented; reconnect before expiry. There is no public sign-up, scheduler worker, review-ready public policy hosting or live publication yet. Do not label this production-ready or a completed live provider test before the owner authorizes accounts.

## Verification

Run `node --experimental-strip-types --test lib/oauth-security.test.ts`, `python3 scripts/test-oauth-state.py`, TypeScript checks, the Sites build helper and a production dependency audit. D1 schema migrations are generated through Drizzle and applied by Sites at deployment. Local state tests verify expiry, ownership/provider/browser binding and replay rejection. Physical Safari and the real provider redirects remain owner tests.
