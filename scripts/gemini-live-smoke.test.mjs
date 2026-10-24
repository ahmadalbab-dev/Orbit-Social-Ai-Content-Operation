import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const env of [{VERCEL_ENV:'production',GEMINI_API_KEY:'private-fixture'},{VERCEL_ENV:'preview'}])test('live Gemini probe refuses production or a missing preview key',()=>{
 const result=spawnSync(process.execPath,['scripts/gemini-live-smoke.mjs'],{env,encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/setup FAIL/);assert.doesNotMatch(result.stdout+result.stderr,/private-fixture/);
});

import {geminiSmokeEnabled} from './api-release.mjs';
test('build smoke is explicit and preview-only',()=>{
 assert.equal(geminiSmokeEnabled({}),false);
 assert.equal(geminiSmokeEnabled({ORBIT_GEMINI_SMOKE_ON_BUILD:'true',VERCEL_ENV:'preview'}),true);
 assert.equal(geminiSmokeEnabled({ORBIT_GEMINI_SMOKE_ON_BUILD:'studio-and-generation',VERCEL_ENV:'preview'}),true);
 assert.equal(geminiSmokeEnabled({ORBIT_GEMINI_SMOKE_ON_BUILD:'unknown',VERCEL_ENV:'preview'}),false);
 assert.throws(()=>geminiSmokeEnabled({ORBIT_GEMINI_SMOKE_ON_BUILD:'studio-and-generation',VERCEL_ENV:'production'}),/Preview/);
 assert.throws(()=>geminiSmokeEnabled({ORBIT_GEMINI_SMOKE_ON_BUILD:'true',VERCEL_ENV:'production'}),/Preview/);
});

for(const missing of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','GEMINI_ALLOW_UNPAID_DATA_USE','AI_IMAGE_PROVIDER','AI_TEXT_PROVIDER'])test(`focused probe rejects missing ${missing} before provider loading or requests`,()=>{
 const env={VERCEL_ENV:'preview',ORBIT_GEMINI_SMOKE_ON_BUILD:'studio-and-generation',AI_TEXT_PROVIDER:'gemini',GEMINI_ALLOW_UNPAID_DATA_USE:'true',AI_IMAGE_PROVIDER:'cloudflare',GEMINI_API_KEY:'private-gemini-fixture',CLOUDFLARE_API_TOKEN:'private-cloudflare-fixture',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32)};delete env[missing];
 const result=spawnSync(process.execPath,['scripts/gemini-live-smoke.mjs'],{env,encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/focused-setup FAIL/);
 assert.doesNotMatch(result.stdout+result.stderr,/private-gemini-fixture|private-cloudflare-fixture|ORBIT_GEMINI_HTTP/);
});
