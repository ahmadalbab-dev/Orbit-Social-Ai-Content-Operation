// Opt-in release migrations run on Vercel, where the database Secret already lives.
// Ordinary builds never migrate. Prisma owns the migration history.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function geminiSmokeEnabled(env) {
  if (!['true', 'studio-and-generation'].includes(env.ORBIT_GEMINI_SMOKE_ON_BUILD)) return false;
  if (env.VERCEL_ENV !== 'preview') throw Error('Gemini smoke requires Preview.');
  return true;
}

export function gatewaySmokeEnabled(env) {
  if (env.ORBIT_GATEWAY_SMOKE_ON_BUILD !== 'true') return false;
  if (env.VERCEL_ENV !== 'preview') throw Error('Gateway smoke requires Preview.');
  return true;
}

export function migrationUrl(env) {
  if (env.ORBIT_MIGRATE_ON_BUILD !== 'true') return null;
  if (env.VERCEL_ENV !== 'production') throw Error('Release migrations require Production.');
  const ref = env.ORBIT_MIGRATION_PROJECT_REF;
  if (!/^[a-z]{20}$/.test(ref ?? '')) throw Error('An explicit migration project reference is required.');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw Error('A valid database Secret is required.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) ||
      !['5432', '6543'].includes(url.port) || url.pathname !== '/postgres' ||
      decodeURIComponent(url.username) !== `postgres.${ref}` || !url.password || url.hash) {
    throw Error('Release database must match the explicitly selected Supabase project and pooler.');
  }
  // Supabase's session pooler uses the same credentials/host on port 5432.
  url.port = '5432';
  url.searchParams.delete('pgbouncer');
  url.searchParams.set('sslmode', 'require');
  return url.href;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Validate before building, without logging the database URL.
  const releaseUrl = migrationUrl(process.env);
  const root = fileURLToPath(new URL('../', import.meta.url));
  function run(args, env = process.env) {
    const result = spawnSync('pnpm', args, { cwd: root, env, stdio: 'inherit' });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
  }
  run(['--filter', '@sma/api...', 'build']);
  if (geminiSmokeEnabled(process.env)) {
    const result = spawnSync(process.execPath, ['scripts/gemini-live-smoke.mjs'], {cwd:root, env:process.env, stdio:'inherit'});
    if (result.error || result.status !== 0) process.exit(result.status || 1);
  }
  if (gatewaySmokeEnabled(process.env)) {
    const result = spawnSync(process.execPath, ['scripts/gateway-live-smoke.mjs'], {cwd:root, env:process.env, stdio:'inherit'});
    if (result.error || result.status !== 0) process.exit(result.status || 1);
  }
  if (releaseUrl) {
    run(['--filter', '@sma/database', 'migrate:deploy'], { ...process.env, DATABASE_URL: releaseUrl });
    console.log('Tracked release migrations completed. Runtime database configuration is unchanged.');
  }
}
