# Hosting decision: Cloudflare first

Reviewed: 16 October 2026, Kuala Lumpur. Owner: **ORBIT-OPS, Operations & Infrastructure**.

**Recommendation:** use Cloudflare for Orbit's domain, edge protection and controlled staging access. Initially keep the existing Node/Docker web, API and media worker on a host with persistent private volumes. Evaluate Cloudflare-native hosting after storage and worker compatibility tests. This is a proposed architecture; Cloudflare protection has not been deployed or verified for this commercial app.

Cloudflare and Firebase both offer useful security controls. Neither makes code, account access, uploaded files or tenant authorization immune to compromise. Changing provider does not fix an authorization defect or exposed secret.

## Repository requirements

The current repository uses Next.js 15, NestJS 11 on Node, Prisma/PostgreSQL, and a separate FFmpeg/FFprobe worker. `deploy/staging/compose.yml` mounts the same private `/media` volume in the API and worker; the database has another persistent volume. Host ports bind to loopback. `apps/api/src/media-storage.ts` uses local filesystem paths, exclusive files, byte limits, file signatures and workspace-scoped directories. No R2 storage adapter exists yet.

An object bucket does not directly replace that shared directory. Preserve the current storage contract until a tested replacement exists.

## Comparison for Orbit

| Need | Cloudflare | Firebase / Google Cloud | Decision |
|---|---|---|---|
| Public edge | DNS, proxied HTTP traffic, DDoS and WAF controls; coverage depends on plan/configuration | Hosting/App Hosting managed delivery; App Hosting uses Cloud CDN and Cloud Run | Prefer Cloudflare as requested |
| Next.js frontend | Workers requires a supported adapter and runtime checks | App Hosting supports Next.js 13.5+ | Keep Docker initially; evaluate Workers separately |
| NestJS API | Workers provides a subset of Node APIs; full container workload is a separate choice | Containerized API can run on Cloud Run | Preserve API contract and PostgreSQL |
| FFmpeg rendering | Containers provide Linux execution; lifecycle and ephemeral disk need explicit handling | A separate worker service/job still needs configuration | Keep worker isolated with resource limits |
| Private media | R2 private by default; server credentials and authorized short-lived object access | Cloud Storage access uses configured IAM and relevant Firebase Security Rules | Plan private R2 after adapter work |
| Application security | Edge rules complement auth, validation and tenant checks | App Check, Authentication, IAM and Rules address different concerns | Keep server authorization on either host |
| Cost | Selected security/compute/storage products have their own allowances and plans | App Hosting requires Blaze and underlying Google Cloud usage matters | Estimate workload before purchase; no all-free assumption |

## Phase 1: compatible staging

1. Select a Docker-compatible origin host and domain. Preserve private database/media volumes and test backup restoration.
2. Route web/API through Cloudflare Tunnel or a suitably restricted HTTPS origin. Tunnel uses outbound connections and can avoid origin inbound ports. Do not leave an alternate public origin that bypasses the edge.
3. Put private staging/admin pages behind a restricted Cloudflare Access policy. This supplements Orbit login and workspace membership checks.
4. Configure available WAF rules and rate limits, then verify them. The Free Managed Ruleset targets high-impact, widely exploited vulnerabilities; broader managed protection is not implied by the Free plan.
5. Keep OAuth callbacks and Stripe webhooks reachable without interactive Access login or browser challenges. Narrow exceptions must retain OAuth state checks and Stripe signature verification in the application. Test actual provider delivery.
6. Keep PostgreSQL private, secrets server-side, account permissions limited and logs free of tokens. Patch dependencies and restrict render process resources. Check upload/body limits before phone testing.
7. Verify Safari sign-in, OAuth, upload, render, cancellation and download on the real staging domain. Register callbacks only for confirmed deployed routes.

Domain ownership, Cloudflare account access, origin host, identity configuration and backup destination remain setup inputs. This review created no account, DNS record, Tunnel, bucket or paid hosting resource.

## Phase 2: private R2 and optional native runtime

- Add a small storage interface and R2 adapter; persist object keys instead of absolute paths. Check workspace permissions before issuing upload/download access.
- Download authorized inputs to isolated scratch, render, upload the output and atomically record completion. Test cancellation, retry, lease recovery, duplicate completion, cleanup and retention across restarts.
- Keep customer drafts/exports private, including disabling public `r2.dev`. Presigned URLs are bearer capabilities; scope them to one object/operation and short expiry. They do not independently re-check Orbit membership after issuance.
- Evaluate the frontend adapter separately. Cloudflare's current docs recommend **vinext for new Next.js apps**, while OpenNext remains documented for existing OpenNext deployments. Orbit uses neither today. Avoid an automatic Next.js rewrite; an ordinary Node build does not prove Workers compatibility. OpenNext currently lacks Node.js middleware support introduced in Next.js 15.2.
- Evaluate Cloudflare Containers only after durable object storage works. Disk is ephemeral by default and can be replaced after sleep/restart. Snapshots/FUSE do not directly reproduce the current shared volume contract. The current FAQ says built-in stateless autoscaling is not yet available. Test routing, restart recovery, shutdown and resource behavior before choosing production workers.

## Why not migrate to Firebase now?

Firebase App Hosting is a valid frontend alternative. It builds through Cloud Build, serves on Cloud Run, caches with Cloud CDN and integrates Secret Manager. Hosting can also route to containerized Cloud Run APIs. This does not automatically deploy Orbit's PostgreSQL, shared media volume and separate FFmpeg queue worker as a single service.

Firebase Security Rules govern supported Firebase data access, not Orbit's Prisma/PostgreSQL queries. IAM limits project/service permissions. App Check attests app/device requests and complements user authentication; Firebase explicitly says it prevents some, not all, abuse. Those controls require implementation. Migrating Orbit's identity/database solely for a security label adds work without proving stronger application security.

## Official evidence

Sources checked during this review; capabilities can change. No price amounts are quoted.

- [Cloudflare WAF](https://developers.cloudflare.com/waf/), [Managed Rules](https://developers.cloudflare.com/waf/managed-rules/) and [security feature interoperability](https://developers.cloudflare.com/waf/feature-interoperability/).
- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/) and [Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/).
- [Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) and [OpenNext adapter](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).
- [Cloudflare Containers](https://developers.cloudflare.com/containers/) and [FAQ: disk, lifecycle and scaling](https://developers.cloudflare.com/containers/faq/).
- [R2 public access](https://developers.cloudflare.com/r2/buckets/public-buckets/) and [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
- [Firebase App Hosting architecture](https://firebase.google.com/docs/app-hosting/about-app-hosting), [cost requirements](https://firebase.google.com/docs/app-hosting/costs) and [Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run).
- [Firebase App Check](https://firebase.google.com/docs/app-check), [Security Rules](https://firebase.google.com/docs/rules/rules-behavior) and [IAM](https://firebase.google.com/docs/projects/iam/overview).
