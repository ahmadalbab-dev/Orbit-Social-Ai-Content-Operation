# Vid.AI, Hermoso and Hugo: integration review

Reviewed24 October2026 against official pages/docs plus inspected public captures.
Recommendation: adopt useful conversation/artifact patterns now with Orbit's
working Gemini/Cloudflare routes. Treat external providers as optional connectors,
not free infrastructure bundled into Orbit's$1/$3 subscriptions.

## Vid.AI

Verified REST base `https://vid.ai/api/v1`; API tokens use a separate developer
credential from MCP. MCP endpoint `https://vid.ai/api/mcp`, with OAuth/PKCE or
revocable MCP bearer keys. Workflow: options→estimate→approve capped credits→create
editable script/scenes→generate→poll→render→download. This is a useful asynchronous
job design; API response contracts matter more than marketing model labels.

Current published monthly plans start$39, then$99/$199. No free trial is advertised;
API generation requires an active paid subscription/credits. Stock-media rights
belong to their service terms, not to the appearance of a download button.
A public standalone SDK/CLI or full frontend-source licence was not verified.
Do not call private browser endpoints or copy their application bundle.

Sources: https://vid.ai/docs , https://vid.ai/docs/api ,
https://vid.ai/docs/mcp , https://vid.ai/pricing ,
https://vid.ai/terms-and-conditions

## Hermoso

Verified server-side REST `https://app.hermoso.ai/v1`, hosted MCP
`https://app.hermoso.ai/mcp`, CLI/npm package `hermoso`, installable agent plugins/
skills and an official public connector repository. REST supports resources,
credit reads, job/tool calls and idempotency. OAuth grants broad account access;
Orbit must enforce its own tenant/action permissions. Never expose an owner key
or a full unrestricted tool catalogue in the browser.

Public connector source was saved/read without execution on DESKTOP-ALBAB:
`C:\Users\User\Documents\Codex\2026-10-24\research-hermoso`.
Reviewed commit `fc4c7431ebed5e77352fb25798644308f218c8fe`, package0.1.436,
MIT licence. This repo contains CLI/MCP/skills, not the full proprietary Studio UI.
Copying substantial connector code requires preserving its MIT notice.
No vendor executable code was imported into Orbit by this change.

Sources: https://hermoso.ai/docs/api/ , https://hermoso.ai/docs/cli/ ,
https://hermoso.ai/mcp/ , https://github.com/hermoso-ai/hermoso ,
https://github.com/hermoso-ai/hermoso/blob/main/LICENSE

Free onboarding advertises250+ earned/setup credits,30 at signup; not250 per month.
Paid plans advertise$29/$69/$149 monthly. Chat/planning itself can spend credits.
The agentic signup API requires paid checkout, unlike human free signup. Do not
activate it, create accounts or treat trial credits as recurring customer capacity.
White-label/resale rights and cross-customer account isolation need confirmation.

Sources: https://hermoso.ai/pricing , https://hermoso.ai/docs/api/

## Hugo / Crisp

This Hugo is Crisp's customer-support agent. Crisp offers REST/RTM APIs, web/mobile
SDKs, plugin/widget APIs and two distinct MCP directions: Hugo calls your backend
MCP tools; Hugo's beta server exposes documented knowledge search to other agents.
Widget Tools run explicitly registered handlers in an active visitor chatbox.
Session IDs are context, not authentication; sensitive operations need verified
identity and signed/authenticated requests.

Useful later for Orbit help/support and contextual editor guidance, not a source
of image/video inference. Published14-day trial is not permanent free AI. Pricing
and EU-hosting/GDPR language are vendor claims, not an audit of Orbit's compliance.
The public Crisp web SDK has an MIT licence; that does not licence all Hugo UI
or hosted services. No separate Hugo CLI/full frontend source was confirmed.

Sources: https://hugo.ai/en/ , https://docs.crisp.chat/guides/hugo/ ,
https://docs.crisp.chat/guides/hugo/mcp-api/quickstart/ ,
https://docs.crisp.chat/guides/hugo/mcp-server/ ,
https://docs.crisp.chat/guides/hugo/widget-tools/ ,
https://github.com/crisp-im/crisp-sdk-web

## Integration order and current delivery

1. Original React/CSS conversation UI in Studio and Media using existing providers.
2. Preserve explicit Generate/Prepare→review→Apply/export; no auto-run/publishing.
3. Consider Hermoso REST only for a measured missing capability, after account,
   exact cost, model/asset rights, retention and tenant-boundary review.
4. Consider Vid.AI for funded asynchronous video jobs with cost caps/status polls.
5. Consider Hugo/Crisp for support, with a separate verified support identity.

No vendor signup, external generation, paid activation, installation or social
posting was performed for this research. Existing successful Gemini/Cloudflare
live probes were not repeated. Design evidence/limits: `reference-ai-chat/DESIGN.md`.
