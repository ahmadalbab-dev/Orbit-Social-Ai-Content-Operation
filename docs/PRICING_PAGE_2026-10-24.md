# Free / Essential / Professional pricing page

The owner's latest direction supersedes the four-plan research proposal: Free exploration, Essential USD1/month, Professional USD3/month. This change implements a public /pricing page, /preview/pricing and a Pricing / Plans link in the main navigation and collapsed menu. The hero alignment, typography and artwork remain untouched.

## Product proposal shown in the page

- Free: basic local tools/projects/export, 3 one-time AI trial credits, and one generated image OR one video up to six seconds once per account. The media choice is mutually exclusive, not one of each.
- Essential: USD1/month, 20 monthly AI credits, selected image-generation templates and video generation up to 15 seconds/clip within credits.
- Professional: USD3/month, 60 monthly AI credits, the full available editor/template toolkit and brand/destination workflows, subject to credits and actual feature availability.
- All plans are for one person. Team invitations are excluded. Full access is not unlimited AI, unbounded storage or a promise of future integrations.

The credit counts are proposed launch values for design review, not provider tokens or guaranteed numbers of generated videos. Real model/action costs must be calibrated before paid activation. Image/video generation is explicitly marked coming soon because the current video pipeline edits/plans existing clips rather than offering a verified text-to-video generator.

## Billing boundary

This is a functional plan-selection preview, not a new live subscription implementation. Paid buttons open an accessible native modal with price, allowance and availability; Free opens Studio. No request to Stripe, AI providers or the billing API is made from the page, and choosing a plan grants no entitlement. Existing test-only Creator/Business billing IDs are not remapped to the new labels, avoiding accidental checkout at unrelated configured prices. The visible page notice, modals and FAQ disclose that subscriptions are not open yet. Actual paid activation, account-wide trial enforcement and server-side quotas remain separate work.

## Design and navigation

Three equal-height cards, an accent Professional card, a comparison table, accordions and clear monthly USD pricing use Orbit's existing palette and font. No popularity claims, countdowns, hidden annual totals or automatic checkout. Hover motion follows reduced-motion/device preferences; the comparison table scrolls internally on narrow screens. The seven-item phone dock scrolls horizontally at its narrowest width to preserve 44px targets without widening the page.

Collect UI pricing references were reviewed as inspiration, not copied assets or code. Its dynamically rendered gallery exposes limited detail in retrieval, so pixel-level fidelity to a specific designer's card is not claimed:
https://collectui.com/designs/pricing-ui-design-inspiration/b9c1d044-39fd-441c-856f-b7bf6717bc96

## Checks

Acceptance covers main-navbar and collapsed-menu navigation, public versus preview links, Free-to-Studio routing, paid modal price/notice/close/Escape/focus behavior, both themes, reduced motion, mobile overflow, Professional button text contrast and zero payment/provider POST requests. Results are recorded after execution. Backend billing code, secrets, data and production release configuration are unchanged.
