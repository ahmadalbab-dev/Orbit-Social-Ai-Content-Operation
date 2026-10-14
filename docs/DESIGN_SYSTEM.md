# Orbit light design system, v0.2

Reference: https://ponytail.dev (reviewed 15 October 2026, Malaysia time). Orbit re-creates the floating navigation, monospace headings, soft gradient accents, numbered sections and restrained text controls in an original light interface for social-media operations. Ponytail's brand, copy, benchmark claims and coding-agent features are not transplanted into Orbit.

| Reference pattern | Orbit adaptation |
| --- | --- |
| Floating navigation and mobile menu | Web navigation pill; phone bottom dock and native More popover |
| Large hero and animated field | Social-media hero with Orbit rings and Facebook/Instagram/Threads SVG badges |
| Benchmark rows | Counts of actual workspace draft, approved and scheduled records |
| Numbered sections and ladder | Workspace, creative tools, create/review/schedule and real draft queue |
| Review panels | Channel editor, live text preview and separate owner-review controls |
| Text switches | Per-channel draft selector and calendar channel filters |
| Install section | Phone installation guide in Settings |
| Footer | Orbit identity and existing privacy/terms/data routes |

Palette: warm paper #FAFAF7, ink #272638, mint #DBF5E9, lavender #EDE7FC, peach #FFE9DC and purple #6551C9. System monospace fonts preserve the reference's typography without adding remote font requests. Surface, motion, icon and spacing rules are shared by the web app and the mobile builder.

Action icons use the already installed Lucide library (ISC). Facebook/Instagram use its recognizable platform glyphs; Threads path is from Simple Icons (CC0): https://github.com/simple-icons/simple-icons/blob/develop/icons/threads.svg and https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md. Platform marks identify the platforms and do not imply endorsement.

Additional visual references reviewed: https://unblast.com/free-social-media-icons-vector/ and https://www.uistore.design/categories/apps/. No downloaded UI kit or icon-pack files from these directories are bundled.

Concise visible action labels, accessible names, icon tooltips and pressed/current states make actions understandable. More uses native popover behavior for light dismissal and Escape. Decorative animation can be paused and honors reduced-motion preferences. Existing drafts and selected video remain mounted when switching tabs. Help text is progressive disclosure; limitations and review rules remain available.

Calendar records remain simulated, display Malaysia time, and never claim automated execution. New pure date tests cover midnight rollover and leap months. Playwright regression checks cover review, video settings, persistence, mobile navigation/overflow and retaining unsaved draft edits across tab changes. In-session visual browser QA and physical iPhone playback are not available here; GitHub browser checks provide automated layout/behavior evidence.
