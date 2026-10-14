# News report local renderer

Standalone Remotion tool for Orbit's Video Editor settings. The approved design uses a 35 percent transparent red panel, white 27px title at 512px width and date directly above the title. Original audio is retained. The input clip is not committed to the repository.

1. In Orbit Video Editor choose your video, set title/date/format, confirm source fps and export render settings.
2. Copy your clip to `public/scene.mp4`. Save exported JSON as `settings.json` here.
3. Run `npm install` in this directory.
4. Run `npm run preview` to inspect the composition, or `npm run render` for `output.mp4`.

The settings include source duration converted to frame count, output dimensions, title, date, opacity and font size. Confirm fps with ffprobe if uncertain. The renderer uses contain fitting to preserve the input frame; changing the aspect ratio adds background space rather than cropping. No web/cloud render worker is connected yet. Remotion's own licensing conditions must be checked for the intended business/team use; do not assume all commercial use is free.

Do not commit settings, private videos or rendered outputs. API tokens are never needed for rendering.
