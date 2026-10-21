# Music selection: implementation and provider findings

## Reproduced boundary

The prior editor sent a cross-origin browser fetch directly to Openverse. Its exact displayed "Cannot reach the sound library" branch means an upstream non-2xx status other than429 was returned; a browser fetch rejected for CORS/network would instead take the thrown-error branch. The precise status on the user's iPhone has not been observed and must not be invented. Earlier cloud requests encountered a Cloudflare403 challenge, whereas DESKTOP-ALBAB could read the catalogue. CLI catalogue200 and CDN download success did not establish Safari browser selection/import.

## Current flow

Music shows two source-verified CC0 starter tracks immediately, first selected for manual preview. Their MP3 assets are delivered from Orbit's own origin, independently of Openverse/Freesound availability. No autoplay or hidden provider call. Users review source/CC0 terms before importing through the existing local soundtrack decoder.

Search calls same-origin `GET /api/music/search?q=...`. Server fetches only fixed Openverse audio endpoint with source=freesound,license=cc0,page_size=40. No browser cookies/authorization/arbitrary destination is forwarded. Query length/keys bounded, JSON streamed with512KiB cap, timeout8seconds, redirects rejected, per-instance concurrency capped4 and cache limited32queries/60seconds. Output projected from validated source/preview/license paths; raw provider messages never returned. This is a bounded public catalogue reader, not audio/URL proxy or global distributed rate limiter.

Upstream non-2xx, timeout, challenge HTML or malformed/oversized JSON returns explicitly labelled starter mode with zero live results. UI says live search unavailable and keeps real included selection; it does not claim starter choices match search term. Successful queries add validated source previews; live CDN previews remain external and can fail. Existing audio limits/source links/rights confirmation remain.

## Assets and validation

See `/audio/ATTRIBUTION.txt` for source titles/authors/URLs/licences, source/derivative SHA256 hashes and changes. Both source pages affirm CC0 and commercial copying/modification/distribution. Action loop29.18seconds/350503bytes; jungle/rain derivative45.04seconds/540779bytes. Both stereo44.1kHz96kbpsMP3, fully decoded with ffmpeg without errors. Combined payload891282bytes, requested only when preview/import needs it.

Focused tests cover fixed destination, no credential forwarding, CC0 projection, cache, invalid query/URL injection, provider errors, challenge HTML, malformed/oversized bodies and timeout. Browser acceptance includes unmocked same-origin real MP3 playback with advancing currentTime and import to both Image/Video soundtrack; only optional catalogue response is controlled. Chromium/WebKit evidence is not a physical iPhone test.

## Requested provider research (21 October2026)

- https://musicapi.com/ is playlist/library transfer infrastructure across streaming services. Endpoints read/match/write metadata and transfers; sandbox keys do not grant downloadable soundtrack/synchronisation rights. Not wired as export music provider.
- https://massivemusic.com/services/platform-music-delivery-services/api-music-delivery supports streaming/sync/download infrastructure, but catalogue access is determined by specific licence agreements. Official docs https://docs.massivemusic.com/reference/introduction give API base https://api.7digital.com/1.2/ and authentication. Activation needs operator credentials/partner licence and approved use/territories. No agreement/billing activated or guessed adapter/placeholder success.
- https://codehelper.me/resources/apis/music/ is a directory, not API provider. Entries mix metadata, playback, transfers and audio services. Each provider's official rights/credentials need verification; a public stream/metadata response is not export permission.
- Verified Freesound source pages: https://freesound.org/people/burning-mir/sounds/155139/ and https://freesound.org/people/larval1977/sounds/38487/ . Public CC0 previews supply this limited selection, not a licensed popular-song catalogue.

No Spotify ripping, browser credentials, paid account creation, OAuth/billing changes or Ai Office work are part of this patch.

Actual server-handler smoke in the current cloud environment dispatched a real Openverse request and observed upstream403. Handler returned200 with mode=starter, zero live results and explicit unavailability notice, as designed. This verifies failure handling against a real blocked catalogue; it is not proof of successful live search or physical Safari playback.
