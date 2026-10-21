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
provider. Original files remain on the device. This generates/edits still pixels;
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
