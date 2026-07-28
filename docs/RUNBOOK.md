# Runbook

## Health

- Liveness: `GET /v1/health`
- Readiness: `GET /v1/ready`
- Alert on elevated 5xx rate, queue age, failed jobs, token refresh failures, database saturation, and AI budget rejections.

## Failed publishing

1. Inspect the publishing job, connector status, and provider request ID.
2. Classify permanent errors (permission/content rejection) versus transient errors (429/5xx/timeouts).
3. Retry transient failures through the queue; never create a new idempotency key.
4. Ask for re-approval if content changes.

## Compromised credential

Disable the connector, revoke the provider token, rotate the encryption key through a controlled migration, invalidate sessions, review audit logs, and notify affected tenants.

## Database restore

Restore into an isolated environment, verify tenant counts and newest audit/job records, run application smoke tests, then switch traffic. Test this quarterly.
