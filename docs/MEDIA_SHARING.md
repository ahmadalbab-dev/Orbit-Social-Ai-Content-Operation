# Share exported media

Image and video editors retain the last successfully exported image/movie as a local File. After export, use **Share export** in the Export panel to open the device share menu on a fresh click. Existing export/download behavior is retained. New edits require another export; the panel identifies the last export explicitly. Carousel ZIP is downloaded normally, not offered as a social image carousel.

This manual handoff requires no Orbit social-account connection or OAuth. It does not upload the file to an Orbit API. The receiving app controls accepted media, captions and final publication. Orbit does not know which destination was selected or whether a post was published. No platform-specific direct composer or Instagram/Facebook/Threads target is guaranteed by the browser.

File sharing checks both navigator.share and navigator.canShare for the exact File. Unsupported files/browsers and failures retain a Download exported file fallback. Cancellation does not mark content posted. MP4 versus WebM support still depends on the existing video encoder and receiving app. A failed export never creates a new share result.

Automated acceptance replaces the native share API to verify the browser passes the exact exported bytes, handles cancellation/unsupported files and retains byte-identical download fallback without provider POSTs. This is a browser integration test, not a real operating-system share or social publication test. Physical Safari/iPhone and installed app handoff remain device acceptance checks.

Account connection is separate: the OAuth implementation remains available for verified account access. Background publishing is not enabled by this feature.

References:
- https://www.w3.org/TR/web-share/
- https://webkit.org/blog/13708/allowing-web-share-on-third-party-sites/
