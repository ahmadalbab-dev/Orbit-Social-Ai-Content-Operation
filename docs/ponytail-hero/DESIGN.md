# Orbit hero reference contract

## Evidence and scope

Reference: https://ponytail.dev/, fresh homepage capture on 2026-10-23, plus the user's `20261023-0857-09.6855396.mp4` (36.03 seconds). The actual screenshot pixels and timed video frames were inspected. The original local extract is `C:\Users\User\Documents\Codex\2026-10-17\this-is-the-dedicated-ai-office\outputs\ponytail-copy` and is preserved unchanged.

Its original `assets/v5/site.js` SHA256 `97f97389cf95ba0f20efd85b35ac08ab3684f039ad435c12225212bdbead08c2` and `site.css` SHA256 `3cfa8717c7a4f05e636f98e0ac5cf44804f8197e6f84e70fa09137a28c01f5d5` match the current upstream files. Attribution: `docs/licenses/PONYTAIL_MIT.txt`.

## Extracted source rules

- Hero fills the screen: height `min(100svh,880px)`, minimum620px. Canvas fills its complete area.
- Lower-left copy uses left `max(28px,calc((100vw - 1180px)/2 + 28px))`; bottom `clamp(56px,11vh,120px)`.
- The source silhouette sits at `.79W,.52H`, size `min(.84H,.38W)` for its single numeral/face. Orbit keeps its longer word and logo identity, so its width is fitted into the right region; it is not claimed to be pixel-identical to a single numeral.
- Headline JetBrains Mono800, `clamp(2rem,4vw,3.6rem)`, line-height1.08; italic second line .86em, weight400. Paragraph1.08rem, max52ch, margin-top22px.
- Source dark background#070606, ink#efe9dd, holographic cyan#7fe3f5/violet#b49cff/pink#ff9fd8. The field uses small normal-weight dim code and bold luminous characters inside the silhouette; no full opaque text underlayer in the hero sequence.
- Source code moves upward by advancing its source row at1.1rows/second. Its original shape switch uses a hash stagger and flicker. Orbit's previous implementation instead moved rows horizontally and crossfaded whole masks, which did not meet the user's specified bottom-to-top movement.
- The requested Orbit correction uses upward code movement plus an explicit bottom-to-top shape handoff. This directional handoff is a user-directed adaptation rather than an assertion that upstream uses a directional mask transition.
- Source has a lower-left radial reading scrim and a fade only at the bottom70%; it does not whitewash the entire bright silhouette.

## Orbit adaptations

Retain Orbit / ai studio wording at the same position, with ai studio .6 of the Orbit font size as previously requested. Keep navigation, auth controls, media tools and social workflows functional. Mobile reserves a free band above the copy rather than overlapping text and canvas. Its word silhouette uses a denser 6.5–8px code grid so the short letters retain enough rows to be legible. On desktop the reading column ends before the longer Orbit word silhouette; the source’s left alignment and headline sizing remain unchanged.

The supplied video is dark-mode evidence. The richer light palette is explicitly user-requested: cream background#faf8f3, foreground#241e29, secondary text#55495b, primary#503099, accent#802b70, dark cyan/violet/magenta hero ink. It is not presented as an extracted Ponytail light theme. Confirm actual screenshots, readable text contrast, both theme transitions and motion phases.

Keep DPR/memory bounds, font-ready resize, visible-tab/offscreen suspension, stable reduced-motion frames and complete cleanup. Pausing must retain artwork; switching theme must repaint a paused canvas. No backend or AI Gateway activation is part of this change.
