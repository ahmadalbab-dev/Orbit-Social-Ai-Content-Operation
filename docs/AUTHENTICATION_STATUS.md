# Orbit Social authentication status

Last reviewed: 28 July 2026

## Two different kinds of authentication

1. **Orbit user login** controls who may open the dashboard. Orbit uses Supabase Auth because the same low-cost platform also supplies PostgreSQL and object storage.
2. **Social account OAuth** lets Orbit publish to a social account after its owner approves access on Meta or TikTok's official consent screen.

WorkOS AuthKit is not part of the first production version. Its locally generated demo is excluded from the pnpm workspace and Git. It may be reconsidered later if enterprise SSO becomes a paid customer requirement.

## Current verified state

| Area | State | Remaining requirement |
| --- | --- | --- |
| Orbit user login | Not connected | Create/link a Supabase project and securely set its URL and publishable key/JWT configuration |
| Facebook Page | App ID known; not authorized | Meta App Secret, deployed HTTPS API callback, permissions/review, then owner consent |
| Instagram Creator | Linked to Facebook Page; not authorized | Same Meta OAuth setup and owner consent |
| Threads | Profile known; not authorized | A Threads developer App ID and App Secret, deployed callback, permissions/review, then owner consent |
| TikTok | Client key and secret stored locally; not authorized | Deployed HTTPS callback, Login Kit/Content Posting configuration and review, then owner consent |

An account name, Page name, profile link, App ID, or Client Key is an identifier—not authorization. Authorization is complete only after the provider returns a one-time OAuth code to Orbit, Orbit exchanges it server-side, and the encrypted token is stored for the correct workspace.

## Security rules

- Never paste passwords, app secrets, access tokens, recovery codes, or Supabase service-role keys into chat.
- Store local secrets only in ignored environment files.
- Store production secrets in the hosting provider's secret manager.
- Keep `SOCIAL_CONNECTOR_MODE=mock` until callbacks, token refresh/revocation, permission scopes, and a private test post pass.
- Never publish on behalf of a user without an explicit approval record.

## URLs available before production deployment

GitHub Pages can host the public policy documents in `docs/legal/`. OAuth callback URLs cannot use GitHub Pages because callbacks need the running NestJS API to exchange and encrypt tokens.

