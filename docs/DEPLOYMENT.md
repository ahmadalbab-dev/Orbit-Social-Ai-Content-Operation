# Low-cost deployment

## Recommended MVP

- Web: Netlify free tier.
- API + worker: one small Render, Railway, Fly.io, or Hetzner service. Keep API and BullMQ worker in the same service initially.
- Database/Auth/Storage: Supabase free tier while within quota.
- Redis: Upstash free tier or a tiny managed Redis instance.
- DNS/CDN: Cloudflare free tier.

Deploy database migrations before API rollout. Use separate staging and production projects. Set all environment variables in platform secret managers. Add a worker process when publishing volume justifies it.

Avoid Kubernetes until operational load, isolation, or scaling proves it necessary.
