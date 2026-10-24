# Meta integration options for Orbit

Research date 14 October 2026. Keep Orbit as the content writing, review and video workspace. Prefer official APIs for the publishing backend; optionally expose a narrowly scoped agent/MCP interface to Orbit's approved workflow later.

## Platform requirements

| Channel | Supported account target | Publishing route |
| --- | --- | --- |
| Facebook | Facebook Page administered by the authorizing user; a share URL alone does not establish a Page ID or permissions | Pages API feed/photo methods; Page access token |
| Instagram | Business or Creator professional account | Facebook Login route requires linked Page; Instagram Login is a separate available route and does not require linking a Page |
| Threads | Authorized Threads profile | Threads API container creation, status check and publication |

The new `MetaPublisher` currently implements Facebook Page text/single-photo; Instagram Facebook Login single-image/Reel; and Threads text/image/video. It requires server credentials and an explicit supported API version. It rejects browser use, unsupported account types, malformed IDs and non-HTTPS media URL syntax. Container methods do not automatically retry, and return readiness/uncertain-outcome states. OAuth, account ownership checks, DNS/media validation, secret lifecycle, durable jobs and analytics are caller responsibilities and are not implemented by this adapter. Facebook video/carousel publishing and the separate Instagram Login route are not yet implemented.

MCP is an agent interface, not an alternative to Meta authorization. A community MCP wrapper still calls Meta APIs with authorized tokens. Connecting an MCP does not establish approval or guarantee platform compliance. No community server was installed or given account credentials during this review.

## Open source alternatives found on GitHub

| Project | License stated in repository | Fit for Orbit | Tradeoff |
| --- | --- | --- | --- |
| gitroomhq/postiz-app | AGPL-3.0 | Self-hosted scheduler with Facebook, Instagram, Threads, public API and agent surfaces | Separate service and infrastructure; self-hosting still requires platform developer apps and authorization |
| gitroomhq/postiz-agent | AGPL-3.0 | CLI for agents talking to a Postiz instance | Does not replace the Postiz server or Meta setup |
| oliverames/meta-mcp-server | MIT | Optional agent tool surface over Meta APIs | Broad tool set includes ads, messages and deletion; allowlist only needed tools and route writes through Orbit approval |

Open-source software licensing does not mean zero hosting, storage, AI-provider or maintenance cost. Keep Postiz as a separately operated API service if chosen rather than copying its code into Orbit. Review applicable license obligations before distributing a modified service. No third-party source was copied into this branch.

## Proposed implementation order

1. Preserve current review-first workflow and truthful simulation states.
2. Wire content, approval, memberships and publishing jobs to Prisma; add durable per-platform worker and reconciliation.
3. Implement official OAuth start/callback with signed single-use state, exact callback URLs, account selection and encrypted token lifecycle.
4. Obtain owner consent for the actual Facebook Page, Instagram professional account and Threads profile. Verify scopes and expiry with harmless read calls.
5. Host approved media at controlled HTTPS URLs and validate format/size before provider upload.
6. Test each approved post explicitly, retain confirmed external IDs, then enable only approved scheduled jobs.
7. Add agent/MCP access with scoped workspace authentication; expose draft and status tools first. Publishing must retain human approval rules until the user explicitly changes policy.

The Facebook URL supplied by Albab is a share link and cannot be treated as a confirmed Page target. The Instagram/Threads username is azhari_101kerja; neither username establishes API authorization. No live posting was performed.

## Primary references

- https://developers.facebook.com/documentation/instagram-platform/content-publishing
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
- https://developers.facebook.com/documentation/pages-api/posts
- https://developers.facebook.com/documentation/threads/posts
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- https://github.com/gitroomhq/postiz-app (README and LICENSE)
- https://github.com/gitroomhq/postiz-agent (README and LICENSE)
- https://github.com/oliverames/meta-mcp-server (README and LICENSE)

Meta developer pages were intermittently inaccessible during this review; detailed request shapes were checked against Meta-owned Postman collections. GitHub capability claims come from project source/readmes, not live validation against Albab's accounts. Confirm current scopes and supported API versions in Meta's dashboard before activation.
