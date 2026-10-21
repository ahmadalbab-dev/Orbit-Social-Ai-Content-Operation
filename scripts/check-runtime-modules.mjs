// Verify emitted artifacts, without Node's optional require(ESM) interoperability.
// No database connection, credentials or provider requests are needed.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

if (!process.execArgv.includes('--no-experimental-require-module')) {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', import.meta.filename], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
assert.equal(typeof require('express').json, 'function', 'API JSON parser runtime dependency is missing');
for (const name of ['database', 'ai', 'config', 'types', 'social-connectors', 'media']) {
  assert.ok(require(`@sma/${name}`), `Unable to require @sma/${name}`);
}
assert.equal(typeof require('@sma/media/worker').processOneRender, 'function');
// Load the complete Nest graph without bootstrapping or connecting Prisma.
require('./dist/apps/api/src/app.module.js');
// Exercise native ESM loading through the compiled guard, not just import jose.
const { TenantAuthGuard } = require('./dist/apps/api/src/security.js');
const { Reflector } = require('@nestjs/core');
const { SignJWT } = await import(pathToFileURL(require.resolve('jose')).href);
const secret = 'runtime-smoke-only-key-at-least-32-bytes';
Object.assign(process.env, {
  NODE_ENV: 'production', DEV_AUTH_ENABLED: 'false', AUTH_JWT_SECRET: secret,
  AUTH_JWT_ISSUER: 'https://runtime.test', AUTH_JWT_AUDIENCE: 'runtime-smoke', AUTH_JWKS_URL: ''
});
const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('runtime-user')
  .setIssuer(process.env.AUTH_JWT_ISSUER).setAudience(process.env.AUTH_JWT_AUDIENCE)
  .setIssuedAt().setExpirationTime('1m').sign(new TextEncoder().encode(secret));
const request = { headers: { authorization: `Bearer ${token}`, 'x-workspace-id': 'runtime-workspace' } };
const db = { user: { findUnique: async () => ({ id: 'runtime-user' }) }, membership: { findFirst: async () => ({ role: 'OWNER' }) } };
const context = { getHandler: () => function handler() {}, getClass: () => class Controller {}, switchToHttp: () => ({ getRequest: () => request }) };
assert.equal(await new TenantAuthGuard(db, new Reflector()).canActivate(context), true);
assert.equal(request.identity.workspaceId, 'runtime-workspace');
const workerRequire = createRequire(new URL('../apps/media-worker/package.json', import.meta.url));
assert.equal(typeof workerRequire('./dist/store.js').createRenderStore, 'function');
console.log('Compiled API, shared packages, worker and JWT runtime loading passed (require ESM disabled).');
