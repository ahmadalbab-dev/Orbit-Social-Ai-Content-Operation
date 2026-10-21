# Social connection release and owner actions

PR #9 was merged at `8b49293d7cb41cc2102f778b028ea7462edef042`. Web and API production deployments report READY. Production `/v1/ready` returned HTTP 200, database connected, livePublishing false. Tracked migration `202610190001_social_oauth_state` is complete; its table has RLS. Migration build opt-in was reset to false.

## Existing production AI test

Use https://orbit-ai-studio-two.vercel.app/editor/image after signing into a workspace. `/preview/editor/image` is deliberately local-only and displays Sign in to use AI image editing. Authenticated access does not fund image inference: the default image engine still needs provider credit/access; Groq text credit is separate. No provider billing has been activated or successful paid image inference claimed.

## Owner configuration

In Vercel, select the **orbit-ai-studio-api** project, Settings → Environment Variables → Production. Configure values directly there; never paste credentials into chat or NEXT_PUBLIC variables. Redeploy the API after saving. API_URL and the Meta/Threads redirect values have already been added to project configuration; the current production build predates those additions and later redeployment is required.

Shared configuration: WEB_URL=https://orbit-ai-studio-two.vercel.app, API_URL=https://orbit-ai-studio-api.vercel.app. Set TOKEN_ENCRYPTION_KEY to a dedicated base64 encoding of 32 cryptographically random bytes; keep it stable after connections are stored. A local Node command to generate it is `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Enter the result into Vercel only.

### Facebook and linked Instagram

1. Open https://developers.facebook.com/apps/ and select/create the Orbit app with the appropriate Facebook Login and Pages/Instagram use cases.
2. Register https://orbit-ai-studio-two.vercel.app/api/social-oauth/meta/callback as the exact valid OAuth redirect. Add the web domain, public privacy/terms and data-deletion details required by the dashboard.
3. Add your own approved developer/tester account. For Instagram, use Business/Creator linked to a Facebook Page you manage.
4. Set META_APP_ID, META_APP_SECRET and META_API_VERSION to this app's credentials and its supported pinned Graph API version. META_REDIRECT_URI must equal the callback above.
5. Implemented permissions are pages_show_list,pages_read_engagement; Instagram additionally requests instagram_basic. Publishing permissions are not requested. Public customer use needs the relevant approved advanced access/app review.

### Threads

1. Configure the Threads API use case in the owner Meta developer app. Use its dedicated Threads app ID/secret.
2. Register https://orbit-ai-studio-two.vercel.app/api/social-oauth/threads/callback and add/accept the Threads tester invitation using the owner account.
3. Set THREADS_APP_ID, THREADS_APP_SECRET and THREADS_REDIRECT_URI. The implemented permission is threads_basic.

### TikTok (follow-up implementation)

Follow the sandbox instructions in [SOCIAL_OAUTH.md](SOCIAL_OAUTH.md#tiktok-login-kit-owner-setup-and-limits). Register https://orbit-ai-studio-two.vercel.app/api/social-oauth/tiktok/callback and set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI. Sandbox allows controlled owner tests; public customers need TikTok review. Only basic profile connection is implemented; automatic token refresh and publishing are off. Reconnect after access-token expiry.

## Controlled consent check

After configuration and API redeployment, sign into Orbit as Owner/Admin, open Channels, select provider and Continue. Log into the official provider, approve access, return to Orbit and refresh connection status. Confirm the expected account is in the intended workspace. Denial, replay and a different browser must not connect an account. Configuration readiness is not completed consent.

Native Share remains usable without account linking. The user confirmed an actual WhatsApp share. Orbit cannot promise which destinations the operating system lists or confirm publication inside another app.

## Music verification and remaining limits

Openverse catalog returned HTTP 200 and 170 piano results from DESKTOP-ALBAB, with Access-Control-Allow-Origin:* when the Orbit Origin header was sent. Cloud execution received a Cloudflare challenge; that is not evidence of global outage. A Wikimedia audio HEAD check timed out, so no real track playback/download is claimed. Catalog source URLs, file limits and CC0 checks remain enforced; search is shown open and filtering precedes the display limit in the follow-up patch. Browser acceptance uses controlled audio fixtures to exercise preview/import. Real iPhone playback/export still requires device testing.
