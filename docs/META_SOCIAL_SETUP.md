# Connect Facebook, Instagram, Threads, and TikTok to Orbit Social

Orbit Social must use OAuth. Never paste a social password, access token, app secret, or recovery code into chat or the web interface.

## 1. Prepare the public URLs

Meta and TikTok review normally require a public HTTPS application, privacy policy, terms page, and data-deletion instructions. Localhost is useful for development, but production review needs a real domain.

Orbit callback routes are reserved as:

- Facebook and Instagram: `https://YOUR-API-DOMAIN/v1/oauth/meta/callback`
- Threads: `https://YOUR-API-DOMAIN/v1/oauth/threads/callback`
- TikTok: `https://YOUR-API-DOMAIN/v1/oauth/tiktok/callback`

The real OAuth start/callback handlers must be deployed before these routes are submitted for platform review. Do not switch `SOCIAL_CONNECTOR_MODE` from `mock` to `live` until those handlers, encrypted token storage, token refresh, state verification, and account revocation are tested.

## 2. Configure the Meta developer app

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and create or select a Business-type app owned by the correct Meta Business Portfolio.
2. Add the products/use cases needed for Facebook Login for Business, Facebook Pages, and Instagram publishing.
3. Add the exact Orbit callback URL, app domain, privacy policy URL, terms URL, and data-deletion URL.
4. Add yourself and any testers under App Roles while the app is in development mode.
5. Connect a Facebook Page you administer.
6. Use an Instagram Professional account (Business or Creator) connected to the appropriate Facebook Page.
7. Request only the permissions required by the feature set. Typical publishing implementations need Page/account discovery, Page content publishing, Instagram basic access, and Instagram content publishing. Confirm the current names and review requirements in Meta's dashboard because they can change.
8. Complete Business Verification and App Review before offering the connection to users outside app roles.

Store the resulting values only in the backend environment:

```dotenv
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://YOUR-API-DOMAIN/v1/oauth/meta/callback
```

Official references: [Meta app dashboard](https://developers.facebook.com/apps/), [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/), and [Pages API](https://developers.facebook.com/docs/pages-api/).

## 3. Configure Threads

1. In Meta for Developers, add or configure the Threads API use case.
2. Add your Threads profile as a tester while the app remains in development mode, then accept the tester invitation from the Threads account.
3. Add the exact Threads OAuth redirect URL and deauthorization/data-deletion configuration.
4. Request the minimum scopes needed for profile access, publishing, replies, and insights. Start with publishing only if that is the first Orbit feature.
5. Generate a tester token and validate text publishing in sandbox before requesting access for public users.
6. Complete any required App Review and business verification.

Store the Threads configuration separately:

```dotenv
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=https://YOUR-API-DOMAIN/v1/oauth/threads/callback
```

Official references: [Threads API overview](https://developers.facebook.com/docs/threads/) and [Threads getting started](https://developers.facebook.com/docs/threads/get-started/).

## 4. Configure TikTok

1. Create a TikTok developer app at the [TikTok Developer Portal](https://developers.tiktok.com/).
2. Add Login Kit and the Content Posting API.
3. Configure the production web domain and exact redirect URL.
4. Request the publishing scopes needed by Orbit. Direct posting commonly requires `video.publish`.
5. Complete the Content Posting API audit. Until approval, keep Orbit in mock mode; unaudited posting may be restricted.

```dotenv
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://YOUR-API-DOMAIN/v1/oauth/tiktok/callback
```

Official references: [Login Kit](https://developers.tiktok.com/doc/login-kit-overview) and [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started/).

## 5. Safe activation order

1. Deploy Orbit Web and API on HTTPS.
2. Add all secrets using the hosting provider's secret manager.
3. Implement and test OAuth state/PKCE where supported, callbacks, encrypted token storage, refresh, revocation, and audit logs.
4. Connect developer/test accounts first.
5. Publish a private or sandbox test from Orbit.
6. Complete platform reviews.
7. Connect the production accounts through Orbit's Connections screen.
8. Change `SOCIAL_CONNECTOR_MODE=live` only after every platform test passes.

## Information Matt needs from you

Do not send secrets. Provide only:

- Meta App ID (not the secret).
- Whether your Facebook Page and Instagram Professional account are already linked.
- Your Threads username.
- The production web domain and API domain you want to use.
- Privacy policy, terms, and data-deletion page URLs, if already available.
- TikTok developer app status when created.

App secrets and client secrets should be entered directly into the local `.env` file or deployment secret manager.
