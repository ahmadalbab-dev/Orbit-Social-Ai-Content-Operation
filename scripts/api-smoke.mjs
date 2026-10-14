import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Start the built API, so unresolved imports and lost DI metadata fail CI.
const child = spawn(process.execPath, ['dist/apps/api/src/main.js'], {
  cwd: new URL('../apps/api/', import.meta.url),
  env: { ...process.env, NODE_ENV: 'development', AUTH_MODE: 'local-demo',
    API_BIND_HOST: '127.0.0.1', PORT: '3099', OPENAI_API_KEY: '', SOCIAL_CONNECTOR_MODE: 'mock' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let startupError = '';
child.stderr.on('data', data => { startupError = (startupError + data.toString()).slice(-4000); });
const base = 'http://127.0.0.1:3099/v1';
const headers = { 'content-type': 'application/json', 'x-workspace-id': 'smoke-workspace' };
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`API failed to start: ${startupError}`);
    try { ready = (await fetch(`${base}/health`)).ok; } catch { /* Startup polling. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, 'API did not become ready');
  const create = body => fetch(`${base}/brands`, { method: 'POST', headers, body: JSON.stringify(body) });
  const oversized = await create({ name: 'x'.repeat(70000), voice: 'v', audience: 'a' });
  assert.equal(oversized.status, 413);
  const invalid = await create({ name: 'A', voice: 'B', audience: 'C', extra: 'mock-sensitive-marker' });
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.text();
  assert.ok(invalidBody.includes('Invalid request body'));
  assert.ok(!invalidBody.includes('mock-sensitive-marker'));
  const name = "'; DROP TABLE brands; --";
  const valid = await create({ name, voice: 'B', audience: 'C' });
  assert.equal(valid.status, 201);
  assert.equal((await valid.json()).name, name);
  console.log('Built API startup and HTTP boundaries passed');
} finally {
  child.kill('SIGTERM');
  if (child.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => child.once('exit', resolve));
  }
}
