# Orbit AI conversation interface

Capture/review:24 October2026,1440px desktop. References: https://vid.ai/ ,
https://hermoso.ai/ , https://hugo.ai/en/ . Firecrawl fresh captures returned200;
actual1440×2300 top-page screenshot pixels were inspected for all three.
The public Hermoso app screenshot showed a sign-in wall. Its retrieved page text
contains the composer and navigation, but this does not prove their authenticated
layout or interaction. No private account, hover/mobile state or complete motion
sequence was inspected. This is an original Orbit adaptation, not a pixel match.

## Observed visual references

| Reference | Inspected patterns | Extraction metadata, not Orbit tokens |
|---|---|---|
| Vid.AI | Dark canvas, large prompt box, task pills and prominent Generate; neighbouring media previews | Plus Jakarta Sans; reported52px h1,16px body,16px radius; screenshot blue accents |
| Hermoso | Light workspace-like panels, warm rust accent, visible action/status rows and result tiles | Geist; reported background#FAFAFA, text#171717, accent#C24436; marketing heading81.6px |
| Hugo | Dark promotional canvas with compact sender-labelled chat mockup and composer; blue action controls | Inter body/Feature Display heading; reported primary#2377F6,16px body,12px radius |

Branding fields are automated extraction evidence; they are not a verified
inventory of every CSS rule. Spacing/layout judgements come from screenshot pixels.
The standalone captures are research material outside production assets:
`reference-review/reference-{0,1,2}.png` in the research workspace. Screenshots
and vendor logos/fonts are not copied into Orbit's shipped interface.

## Orbit implementation choices

Use existing Orbit font, ThinkingOrb, appearance variables and light/dark modes.
Adopt a bordered conversation card: slim assistant header, contextual title,
bounded sender-labelled transcript, prompt composer, task suggestions and explicit
Generate/Prepare action. Keep actual draft/canvas and Apply/Undo as result artifacts.

Proposed values are original implementation choices:24px outer radius,16px bubbles,
18px composer padding,44px minimum action height and340px maximum transcript height.
Messages wrap; mobile controls stack. New message motion is a180ms fade/5px rise
and is disabled by reduced-motion and Orbit's motion-off preference.

No invented model picker, Auto-run switch, paid vendor logo or fake file attachment.
Studio suggestions only stage a prompt/task; they never send. Real existing
provider responses populate messages. Notices/errors are labelled Editor, not AI
answers. Earlier messages are not silently submitted to a model.

The transcript keeps at most10 messages,4,000 characters each, in React memory.
Clear messages clears only that transcript. It does not delete drafts/files,
change canvas state or issue a request. Refresh drops transcript; saved drafts
continue using their existing backend. This is a conversation presentation layer,
not durable or unlimited multi-turn agent memory.

## Components and retained behavior

- `ai-chat.tsx`: shared header, bounded log, local history hook and composer slot.
- Studio: prompt suggestions and user/real draft response messages; saved drafts,
  Rewrite, channel destinations and approval controls retain existing contracts.
- Media image/video edit assistant: user/proposal log; Apply still validates the
  current snapshot and Undo remains in the editor.
- Media image generation/editing: prompt/result messages; returned pixels still
  enter the actual canvas through the existing callback.
- Provider endpoints, credentials, quota, billing, Hero and navigation unchanged.

Unverified: authenticated vendor editor screens, exact vendor animation curves,
private UI source licences, mobile vendor layout and commercial resale permission.

## Verification

Twenty focused Chromium/WebKit browser cases passed across320/390/1440px,
light/dark themes and Studio/Media request boundaries. Suggestions make no provider
request; Generate remains explicit; clearing messages preserves the resulting
draft/canvas; pixel generation, quota errors, stale proposals, Apply/Undo and saved
channel destinations retain their behavior. Web TypeScript and production Next
build passed on DESKTOP-ALBAB. Inspected actual screenshots include desktop light,
phone dark and a fixture-backed Studio reply; no screenshot is presented as an
authenticated vendor UI or a new live-provider acceptance run.

The first run had18 passing cases and2 selector ambiguities because an error now
appears both in historical chat and current status. The check was scoped to the
current semantic status and separately verifies the chat copy; all20 then passed.
The final motion selector also uses Orbit's `html[data-motion="paused"]` setting
so dedicated Media workspaces follow the same preference as Studio.
