import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrationUrl } from './api-release.mjs';
const ref = 'abcdefghijklmnopqrst';
const env = { ORBIT_MIGRATE_ON_BUILD: 'true', VERCEL_ENV: 'production', ORBIT_MIGRATION_PROJECT_REF: ref,
  DATABASE_URL: `postgresql://postgres.${ref}:test%40password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` };
test('ordinary builds do not require or use database secrets', () => {
  assert.equal(migrationUrl({}), null);
  assert.equal(migrationUrl({ ...env, ORBIT_MIGRATE_ON_BUILD: 'false' }), null);
});
test('release uses session pooler and TLS without altering runtime input', () => {
  const before = env.DATABASE_URL;
  const url = new URL(migrationUrl(env));
  assert.equal(url.port, '5432'); assert.equal(url.searchParams.has('pgbouncer'), false);
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.get('connection_limit'), '1');
  assert.equal(url.password, 'test%40password'); assert.equal(env.DATABASE_URL, before);
});
test('rejects preview, absent opt-in project and mismatched destinations without leaking secrets', () => {
  for (const override of [{ VERCEL_ENV: 'preview' }, { ORBIT_MIGRATION_PROJECT_REF: '' },
    { DATABASE_URL: env.DATABASE_URL.replace(ref, 'xxxxxxxxxxxxxxxxxxxx') },
    { DATABASE_URL: env.DATABASE_URL.replace('.pooler.supabase.com', '.example.com') },
    { DATABASE_URL: 'DATABASE_URL=secret-value' }]) {
    assert.throws(() => migrationUrl({ ...env, ...override }), error => !error.message.includes('secret-value') && !error.message.includes('test%40password'));
  }
});
