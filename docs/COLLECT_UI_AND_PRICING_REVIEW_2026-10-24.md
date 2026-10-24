# Orbit: Collect UI and subscription proposal

Reviewed 24 October 2026 (Asia/Kuala_Lumpur). Research and recommendations only. No billing products, prices, entitlements, invitations, provider activation or additional interface changes are implemented by this report.

## Authorized interface change

Move the Home hero copy block left to align with the content below, following the owner's annotated screenshot. Preserve vertical position, text, fonts, sizes, colours, background artwork and motion. The hero is full bleed while the lower content changes width at desktop breakpoints; its reading-column offset now follows those same lower-content edges. The phone copy follows the existing content gutter. This does not change the auth page or editor screens.

The existing responsive Home acceptance now checks the horizontal edge against the launchpad below. Chromium and WebKit passed all 12 viewport/browser combinations at 320, 390, 1024, 1440, 1920 and 3840px, with light/dark screenshots. Product changes are confined to home-presentation.css; the acceptance assertion is in home-presentation.spec.ts.

## Collect UI: what can actually be reused

The public homepage describes a curated collection of interface/website inspiration. Its /designs directory and onboarding inspiration page are discoverable. The accessible pages do not establish that it is an installable React component library. A direct HTML fetch also returned HTTP 403; public web retrieval exposes limited content for the dynamic design directory. Therefore this review does not claim an exhaustive inventory of every design or its licence.

| Route | Finding | Orbit decision |
| --- | --- | --- |
| Official API / SDK | No public developer specification found in the reviewed official pages and domain searches | No integration or account key requested |
| CLI / MCP | No official package or server documentation verified | Do not install a similarly named third-party tool on that basis |
| Copyable implementation code | No official component-source download and applicable reuse licence verified for the selected references | Follow the original designer/source and licence before reusing actual code/assets |
| Visual reference | Suitable for studying hierarchy, spacing, cards, forms and onboarding | Rebuild selected patterns using Orbit's own components and tokens |
| Runtime embedding | Not required to achieve the proposed UI improvements | Keep the application independent of the gallery's availability |

Finding no documentation is not proof that a private product/API does not exist. Recheck a specific official offering if the owner supplies one. Do not confuse Collect UI with CollectAPI, usecollect.com or other similarly named products.

Unlike the previously verified Libraries.dev package and Transitions.dev recipes, Collect UI has not supplied a verified drop-in implementation in the material checked here. No gallery image, source bundle, newsletter, tracking script or npm package was imported.

## Suggested future design work, not implemented

1. Pricing: a concise four-plan comparison, explicit monthly USD prices, total included users, connected-account limits and AI usage. Explain usage before checkout; show the full billed amount for any annual offer.
2. First-run onboarding: create a project, add a source, produce one usable output, then offer account connection. Give an understandable next step when a provider is unavailable.
3. Studio and Media: one primary action per screen, consistent source/output cards, separate empty/loading/failed/success states and a clear preview/apply/export sequence.
4. Usage and upgrade panel: show credits remaining, reset date and the credit cost before an AI action. Reaching the AI limit should leave basic editing/export usable.
5. Team panel: show people, roles, pending invitations and remaining seats. Avoid password sharing.

These are recommendations for later selections, not authorization to redesign any of those screens now. Keep the approved hero typography, colour and motion while evaluating other areas. Evaluate conversion with first usable export/draft, completed account connection, upgrade intent, checkout completion and retention; visual attractiveness alone does not prove conversion.

## Public pricing benchmarks

USD, reviewed on the date above. Monthly billing and annual-equivalent prices are separated. These products have different capabilities and scale; this is a small relevant comparison, not a measured market average.

| Product | Month-to-month price | Annual billing comparison | Relevant model |
| --- | --- | --- | --- |
| Buffer | Essentials $6/channel/month; Team $12/channel/month, for the first 10 channels | $60 / $120 per channel per year ($5 / $10 monthly equivalent) | Team includes unlimited users; social accounts drive price |
| Adobe Express | Premium $9.99/month | The cited Premium offer is monthly with no annual commitment | Creative editor, 250 generative credits/user/month |
| Kapwing | Pro $24/member/month; Business $64/member/month | $16 / $50 per member/month equivalent, billed annually | Shared editor workspace with tiered credits |
| Descript | Hobbyist $24/person/month; Creator $35/person/month | $16 / $24 per person/month equivalent, billed annually | Metered media and AI usage; Enterprise is custom |

Buffer's four-channel Essentials example costs $24/month before any volume discounts (4 x $6). Orbit's proposed $4.90 solo price is substantially lower, but is not feature parity with those established products. For creative editing plus AI, this sample places comparable entry paid offers roughly around $10-$24/month; social scheduling may start lower per channel. This is an interpretation of the sample, not a universal normal price.

## Recommended starting offers

Assumption: the owner's prices mean USD per workspace per month, billed monthly. All numbers below are proposals, not active entitlements or promises that planned features already work.

| Plan | Price | Included people | Suggested initial account limit | Positioning |
| --- | --- | --- | --- | --- |
| Free | $0 | Owner only (1 total) | 2 connected social accounts | Basic creation and a small AI trial |
| Individual | $4.90 | Owner only (1 total) | 4 accounts | One creator/brand, limited AI |
| Professional | $15 | Owner + 1 invited person (2 total) | 8 accounts | Small SME collaboration and approval |
| Business, recommended name for the proposed Enterprise tier | $29 | Owner + 5 invited people (6 total) | 12 accounts | Larger shared workspace with a pooled AI allowance |

One Facebook Page and its Instagram account count as two connections. Account limits and publishing entitlements should be marketed only after the relevant live flows pass acceptance. These limits are product suggestions, not current provider restrictions.

$29 divided across six people is about $4.83/person/month before AI, storage, delivery, payment processing and support costs. This is an aggressive SME offer. Do not include unlimited generated video, unbounded storage or Enterprise-level SLA/SSO commitments at this price. Keep the owner's $29 idea if usage is bounded; reserve a true Enterprise package for a separately scoped/custom offer. The name change is advice, not a product rename.

## Free: define the seven useful workflows

Rather than exposing an arbitrary 70% of buttons, offer a coherent path to a real result:

1. Manual Studio drafting and ideas.
2. Basic image editing, crop, resize and text.
3. Basic local video trim, text and export.
4. Standard image/video templates.
5. Local audio and appropriately licensed starter music.
6. Device project/source library.
7. Export and manual file sharing.

A small bounded text-AI trial can let users experience the main attraction without granting expensive media generation. Proposed paid differentiators are higher AI usage/media actions, collaboration/brand workflows and cloud/publishing automation once delivered. Do not sell those as available while implementation or live acceptance remains incomplete.

## AI credits and cost controls

Use a customer-facing Orbit credit balance rather than exposing raw provider tokens. Text, image and generated video have different cost units and cannot safely consume one identical credit per action.

A pilot could start with 100 / 300 / 600 monthly credits for Individual / Professional / Business, but these numbers must be calibrated before publishing. They do not mean 100 / 300 / 600 generated images, videos or provider tokens. For initial engineering, a corresponding internal upstream AI budget of roughly $1 / $3 / $6 per workspace is a proposed guardrail, not a validated profit forecast. Free should have a much smaller abuse-controlled trial budget.

Required behavior for the eventual implementation:

- Estimate and display an action's weighted credit cost before confirmation. Measure real billed cost for each selected model, input bound, output cap, resolution and duration before setting the weights.
- Apply one monthly pool to the workspace, shared by all invited users; invitations do not multiply the pool. Credits reset on the billing cycle. Rollover/top-up rules must be explicit if offered.
- Reserve budget atomically before dispatch, settle once with an idempotent request/job identifier, and release unused reservations. Do not charge Orbit credits for an operation that never produces the promised usable result; provider charges on failed jobs must still be tracked internally.
- Enforce both credits and internal cost ceilings on the backend, not only in the browser. Bound provider retries, input size, concurrent jobs, storage and export delivery separately.
- Keep local edits and existing outputs accessible after the AI quota ends. Offer an explicit upgrade or purchased top-up; no surprise automatic charges.
- Benchmark image/video separately. Expensive generated clips can consume many credits or require an explicit add-on. Editing an existing local clip is a different cost path from generating video remotely.

Margins cannot be established without actual per-workspace usage, API cost, storage/egress, payment fee, refunds and support measurements. Validate heavy-user costs in a capped pilot before annual commitments or a broad launch. Show which features are delivered now and which are coming later.

## Invitations and shared access

Professional means one additional person; Business means five additional people. Each has their own Orbit sign-in. The owner grants workspace access to content/assets and connected social accounts through explicit roles, rather than sharing an Orbit password or exposing OAuth tokens.

Owner retains billing/ownership control. Admin manages allowed people/connections; Editor drafts/edits; publishing approval can be assigned separately. An invited person should not automatically receive billing, ownership transfer, secret export or unrestricted publishing rights. Check active members plus pending invitations against the seat limit, expire/revoke invitations and enforce workspace authorization on the server. These controls are requirements for a future implementation, not an assertion of completed team access.

## Release recommendation

Keep Free + $4.90 + $15 + $29 as the owner's proposed launch ladder, label the last plan Business, and clearly bound AI, connections and team seats. Complete the promised AI, music, OAuth and publish/share flows before enabling paid checkout for them. Publish a simple comparison with an authentic successful-output demo; do not compensate for broken workflows with a larger feature list.

## Sources checked

- https://collectui.com/
- https://collectui.com/designs
- https://collectui.com/designs/onboarding-ui-design-inspiration
- https://buffer.com/pricing
- https://support.buffer.com/articles/buffer-pricing-and-features-6pJrOPuzIt
- https://www.adobe.com/express/pricing
- https://www.kapwing.com/pricing
- https://www.kapwing.com/help/subscription-faq-2/
- https://www.descript.com/pricing

The Collect UI pages expose limited dynamic content and no verified code-reuse offering in this review. Publer's official page was also checked, but its dynamic paid price values were not visible in retrieval, so no precise paid-price benchmark is asserted for it. Buffer pricing.md returned an unsupported content type in web retrieval; monthly figures above come from Buffer's official Help Center. Kapwing's official FAQ disambiguates monthly and annual pricing.
