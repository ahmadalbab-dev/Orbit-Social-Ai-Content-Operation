# Meta account connections

Orbit has a server OAuth connection flow for Facebook Pages, Instagram professional accounts linked to Facebook Pages, and Threads profiles. Live publishing stays disabled. This implementation does not connect TikTok and does not request publishing permissions.

Never paste social passwords, access tokens, app secrets or recovery codes into chat or the web interface. Set secrets directly in the backend environment or hosting secret manager.

## Exact callback URLs

Register the **web application's** HTTPS routes, not the API POST endpoint:

| App family | Registered redirect URI |
| --- | --- |
| Facebook / Instagram | `https://YOUR-WEB-DOMAIN/api/social-oauth/meta/callback` |
| Threads | `https://YOUR-WEB-DOMAIN/api/social-oauth/threads/callback` |

The browser GET callback is a server bridge to the API. `WEB_URL` and `API_URL` must be bare HTTPS origins. Redirect variables must match these paths exactly; no trailing slash, query or fragment. API routes below include the configured `/v1` prefix.

## Backend configuration

```dotenv
WEB_URL=https://YOUR-WEB-DOMAIN
API_URL=https://YOUR-API-DOMAIN
META_APP_ID=
META_APP_SECRET=
META_API_VERSION=
META_REDIRECT_URI=https://YOUR-WEB-DOMAIN/api/social-oauth/meta/callback
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=https://YOUR-WEB-DOMAIN/api/social-oauth/threads/callback
TOKEN_ENCRYPTION_KEY=
SOCIAL_CONNECTOR_MODE=mock
```

Pin `META_API_VERSION` to the currently supported `vNN.0` version selected for your Meta app; do not guess it from a sample. `TOKEN_ENCRYPTION_KEY` is a dedicated base64 encoding of 32 random bytes. Keep this stable: replacing it without a token migration prevents existing token decryption. Threads credentials are the separate Threads use-case app ID and secret, not automatically the regular Meta app credentials. The Threads API follows the app's default API version using Meta's current unversioned sample route.

## App setup and access

1. Configure the appropriate Meta app/use cases for Facebook Login and Pages/Instagram access. Add the app domain and exact registered redirect above, privacy policy, terms and data deletion information.
2. During development, add authorized testers/app roles. Instagram uses **Facebook Login**, requires a Business or Creator account linked to a Page, and discovers accounts through the Page list. It does not use Instagram Login.
3. Configure the separate Threads API use case, its exact callback and tester invitations. Testers must accept invitations in Threads.
4. Request only the implemented discovery permissions below. Complete applicable App Review, advanced access and business verification before offering connections outside app roles. Dashboard app configuration and approved access must be checked by the app owner.
5. Sign into Orbit as a workspace Owner or Admin and connect through Channels. No manually pasted tokens are needed. Denied consent or provider errors return a generic failure; start again from Channels to retry.

| Provider | Permissions requested | Account discovery |
| --- | --- | --- |
| Facebook | `pages_show_list`, `pages_read_engagement` | Managed Facebook Pages via `/me/accounts` |
| Instagram | `pages_show_list`, `pages_read_engagement`, `instagram_basic` | Linked `instagram_business_account` for each Page |
| Threads | `threads_basic` | Own profile via `/me?fields=id,username` |

Orbit inspects the granted token's app ID, validity, expiry and scopes, verifies required Meta permissions, and stores granted scopes. The connection's expiry is the earlier positive provider token/data-access expiry. For Page tokens this is conservatively bounded by the authorizing user's grant; it is not a promise of a Page token's independent lifetime. Missing trustworthy expiry fails closed. A stored connection is not a live provider health check: revocation can invalidate a token earlier. Reconnect explicitly when expired or revoked. No refresh token, long-lived exchange or automatic refresh is claimed or performed.

## Readiness and limits

The repository includes mocked provider tests for authorization boundaries, replay, expiry, route-family binding, provider failures, grant inspection, account discovery, encrypted storage and tenant status. These do not replace an owner-authorized consent smoke test against the real configured app. No real credentials, app review approval, live consent or production deployment is assumed.

Apply the repository database migrations and configure both web and API environments before a controlled test deployment. Follow [the OAuth operations guide](SOCIAL_OAUTH.md) for the request contract and test procedure. Do not switch live publishing on: publishing authorization, token lifecycle/revocation handling and a separate end-to-end publishing validation remain outside this connection flow.

## Official references checked 2026-10-20

- [Instagram Platform overview](https://developers.facebook.com/documentation/instagram-platform/overview)
- [Facebook Login for Business for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram)
- [Meta Pages API](https://developers.facebook.com/docs/pages-api/)
- [Threads access tokens and permissions](https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/)
- [Meta's maintained Threads sample](https://github.com/fbsamples/threads_api)
- [Official Threads request implementation](https://github.com/fbsamples/threads_api/blob/main/src/index.js)
- [Official Threads sample environment](https://github.com/fbsamples/threads_api/blob/main/.env.template)

The direct Meta developer documentation fetches returned HTTP 429 in this environment. Current Threads host, form token exchange, unversioned default and token-debug response fields were checked against the retrieved official `fbsamples/threads_api` source. Dashboard access, app-specific approval and real provider responses still require the owner's controlled test.
