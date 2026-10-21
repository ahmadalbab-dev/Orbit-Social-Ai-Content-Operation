# Cloudflare image editing

This adds an explicit image provider without changing the editor layout or text AI.

## Configuration

On the API server only, configure `CLOUDFLARE_API_TOKEN` as a Secret,
`CLOUDFLARE_ACCOUNT_ID` as the 32-character hexadecimal account ID, and
`AI_IMAGE_PROVIDER=cloudflare`. Existing Gemini/Hugging Face credentials remain
stored but are not tried as fallback. A stored key is configuration, not proof of
provider access or successful inference. Redeploy the API after changing its
environment. The frontend also needs this release to identify the provider and
bound the shared reference preview.

The explicit Edit image with AI action sends a reduced copy and instruction to
Cloudflare FLUX.2 Klein 4B. Cloudflare's published launch example uses multipart
`prompt` and binary `input_image_0`; reference images must be smaller than
512 by 512. The browser bounds the longest preview side to 511 pixels for this
provider. The API independently checks PNG IHDR or JPEG frame dimensions before
billing checks or quota reservation. Missing, malformed, zero-sized or 512px+
references return HTTP 400 without consuming quota or calling a provider. The
adapter repeats this validation for direct use. This also protects cached older
frontends that prepare 1024px previews. Original files remain on the device. This generates/edits still pixels;
it does not generate video or animate subjects. Existing local motion remains
independent.

## Free usage boundary

Cloudflare documentation checked 22 October 2026 lists 10,000 neurons per day on
Workers Free, resetting at 00:00 UTC (08:00 Kuala Lumpur). Neurons measure compute,
not a fixed number of images. Stay on Workers Free for provider-enforced stopping
when the allocation runs out. Workers Paid can bill overage: merely choosing this
adapter does not verify the account plan or impose an account-wide free budget.
No upgrade, payment setup, AI Gateway billing, Gemini inference or paid fallback
is part of this change. Existing authenticated workspace roles, commercial access
checks and monthly generation quota are retained.

## Verification

Adapter and service tests use fixtures; browser acceptance uses a simulated
provider image and verifies bounded upload plus returned canvas pixels. These
are not evidence of a live Cloudflare response. Real inference acceptance requires
the configured account and a signed-in workspace. No secret should be copied into
test fixtures, chat, source files or logs.

## Primary references

- https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/platform/pricing/


## Review and owner test checklist

The PR preview is protected by Vercel login. Sign in with the owner account first.
Verify that both web and API previews are built from the intended PR revision
and that the web preview routes to that API. A web deployment alone does not
update the API. Credentials were saved in Production, which does not establish
that a preview API has them. Do not copy
Production secrets into local files or fixtures. No Production release is made
by this follow-up.

Before a real edit, verify the intended Cloudflare account is Workers Free and
that the authenticated workspace status identifies `cloudflare` and
`configured: true`. Keep `verified: false` until actual inference succeeds. Use a
dedicated configured non-production API for acceptance, or release only through
the separately approved Production process. A simulated image response proves UI
wiring, not account access, quota availability or real generated pixels.

1. Sign into the test workspace and open Image > AI editor, then expand the
   generative image panel. Upload a non-sensitive test image and check that
   Cloudflare is named before clicking **Edit image with AI**.
2. Request a simple background change. Confirm returned pixels appear in the
   canvas and the exported PNG/JPEG opens correctly. Record a sanitized error
   code if this fails; do not enable payments to clear a provider error.
3. Try the existing local crop/filter/export controls and confirm they still work.
4. Under **Music & sound**, preview an included CC0 track, review its source,
   import it, and export an image movie. Confirm actual playback has sound.
   Live search may explicitly fall back to the included starter tracks.
5. On a physical iPhone, repeat music playback and export. CI WebKit is not a
   substitute for device acceptance; recording support varies by browser.

Music integration and provider limitations are recorded in
[MUSIC_INTEGRATION.md](MUSIC_INTEGRATION.md). No MusicAPI/MassiveMusic credentials,
licence agreement, provider billing, social publishing or AI-generated video is
activated by this change.

## Continuation checkpoint, 22 October 2026

Resume from PR #12, branch `feat/cloudflare-image-editing`. Application commit
`42734273b745088cd7a5d63bc23edfb7817df5a0` passed CI #93, including quality,
secret scanning, Chromium/WebKit acceptance and staging container checks.
Local AI103/API212/web173 tests and all 10 package build/typecheck/lint checks
passed; 8 local DB tests were skipped, with DB acceptance covered separately by CI.
This follow-up documentation update changes no application code.

GitHub's Vercel integration reports both previews READY for that application
commit. Web: https://orbit-ai-studio-git-feat-5d2791-ahmadfaizyaakop-7657s-projects.vercel.app
API: https://orbit-ai-studio-api-git-f-10cbe0-ahmadfaizyaakop-7657s-projects.vercel.app
Readiness here is deployment metadata, not authenticated application acceptance.

Remaining work is access-dependent: the cloud browser reaches Vercel login;
Vercel's connector explicitly denied deployment access with HTTP403 at
`read_protection_bypass`. DESKTOP-ALBAB subsequently went offline. Resume with
authorized access to these projects, then check preview API pairing, safe
provider configuration status, Workers Free account status and one actual image
edit/export. Physical iPhone audio/export acceptance remains pending. Do not
repeat source discovery or passed tests unless application code changes or new
failures justify it. Do not retrieve provider secrets, activate billing, merge,
publish socially, or deploy Production as part of this checkpoint.

No tool/event in this session exposes ChatGPT credit-restoration notifications.
Automatic resumption at that exact event has not been configured. The named
`ponytail` skill was absent from both skill catalogs; remote local-skill lookup
was blocked by the offline device. Do not claim it was used.
