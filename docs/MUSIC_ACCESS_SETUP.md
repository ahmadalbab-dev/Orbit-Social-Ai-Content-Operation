# Music catalogue access

Reviewed 23 October 2026, Malaysia.

Orbit searches the Openverse audio API, restricted to CC0 Freesound results.
This is an importable audio catalogue, not Spotify/Apple Music subscription
streaming. A streaming subscription does not establish a licence to include a
track in an exported commercial video.

## Actual evidence

Vercel Preview's live search returned `mode=starter`, `reason=access_denied`.
The starter tracks remain usable, but live catalogue acceptance has failed.
No registered Openverse credentials were present in the web project's environment
metadata at review time. The new server-only adapter supports registered access;
it has not been live-tested with a registered client. Registration is not proof
that the observed upstream 403 will disappear.

## One-time owner setup

1. Open PowerShell on your PC. Paste this command, replacing the email with the
   address you control. It creates an Openverse API application and sends a
   verification email. The response contains credentials, so keep it private.

   ```powershell
   $orbitMusicRegistration = Invoke-RestMethod -Method Post -Uri 'https://api.openverse.org/v1/auth_tokens/register/' -ContentType 'application/json' -Body (@{name='Orbit AI Studio by Orbit';description='Search CC0 audio for user-selected local image and video exports in Orbit AI Studio.';email='YOUR_EMAIL'} | ConvertTo-Json)
   $orbitMusicRegistration
   ```

   If the application name is already taken, use a unique Orbit application name.
   If Openverse presents an access-denied/challenge response, do not keep retrying
   or bypass it; contact Openverse through its official documentation/support.
2. Open the verification email from Openverse and verify that address. Store the
   returned `client_id` and `client_secret`; Openverse says they cannot be
   retrieved later.
3. In Vercel, choose **orbit-ai-studio** (the web project), then **Settings →
   Environment Variables**. Add both as server variables, without `NEXT_PUBLIC_`:

   | Key | Value |
   | --- | --- |
   | `OPENVERSE_CLIENT_ID` | Returned `client_id` |
   | `OPENVERSE_CLIENT_SECRET` | Returned `client_secret`, stored as sensitive |

   Choose Preview and the shared acceptance branch
   `feat/cloudflare-image-editing`. Production can be configured when that
   implementation is released. The API project does not serve this web route.
4. Redeploy that web Preview after saving. Do not paste credentials in chat.
5. Acceptance must show `mode=live`, actual matching results, preview playback,
   track selection and audible exported media. An empty result list or starter
   fallback does not pass. If registered access still returns 403, record its
   sanitized request ID and resolve access with Openverse or choose another
   licensed catalogue explicitly.

## Implementation boundary

Tokens are requested at the fixed Openverse OAuth endpoint using the documented
form-encoded client-credentials grant. They stay server-side, are size-validated,
cached before expiry and shared across simultaneous requests in one instance.
There is no credential forwarding from browser requests, arbitrary provider URL,
challenge bypass, automatic provider switching or public token response.
Failures return bounded reasons without provider payloads/secrets and are not
publicly cached. No dependency, billing activation or API registration was
performed by this patch.

Official contract: https://api.openverse.org/v1/
Official client docs: https://docs.openverse.org/packages/js/api_client/index.html
Terms: https://docs.openverse.org/terms_of_service
