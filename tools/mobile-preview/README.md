# Orbit Social phone testing build v0.2

This package reuses the web app's React UI, shared components and responsive styles. It replaces only API calls with a device-local test adapter at build time. It contains no backend keys, OAuth tokens or live publisher.

## iPhone

Preview URL: https://orbit-mobile-albab-preview.airy-kiwi-2012.chatgpt.site

Open the private preview URL in Safari and sign in to the owning ChatGPT account. Tap Share, Add to Home Screen, enable Open as Web App if shown, and Add. Open the Orbit icon to test. The ZIP is a portable web build, not an IPA installer; it must be served over HTTPS to run on a phone.

## Included tests and features

- Ponytail-inspired light design with mint, lavender and peach accents.
- Overview, Studio, Video, Calendar, Channels and Settings share the web app UI.
- Floating web navigation, phone bottom dock, native More menu, adaptive icons and safe-area spacing.
- Accessible icon controls with concise labels and optional help.
- Per-channel editor/preview and Malaysia month calendar with channel filters.
- Draft edits and video selection are retained while changing tabs.
- Profile settings and saved sample drafts on this browser only.
- Review, approval tied to revision, recorded Malaysia-time schedules and explicitly simulated posting.
- Local video selection with the News report title/date/opacity controls and render-settings JSON export.
- PNG Home Screen icons at 180, 192 and 512 pixels.

AI generation, Meta connections, automatic posting and MP4 rendering are not active in this build. Video stays on the selected device. Phone and desktop storage do not synchronize. Clearing browser/site data removes local drafts and profiles. An internet connection and the private site's sign-in are needed to open it; this release does not cache private pages for offline access.

Build from the repository root:

```
npm ci --prefix tools/mobile-preview
npm run typecheck --prefix tools/mobile-preview
npm test --prefix tools/mobile-preview
npm run build --prefix tools/mobile-preview
```

Host `tools/mobile-preview/dist` as a static HTTPS site. Preserve private access. Do not expose the local-demo backend to make the preview work.

The ZIP contains the built application and install guide. `dist` is generated, ignored by Git and reproduced from this source. A native iOS/TestFlight package would require a separate signed Apple build.
