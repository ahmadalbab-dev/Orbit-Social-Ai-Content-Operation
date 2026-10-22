import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const env of [{VERCEL_ENV:'production',GEMINI_API_KEY:'private-fixture'},{VERCEL_ENV:'preview'}])test('live Gemini probe refuses production or a missing preview key',()=>{
 const result=spawnSync(process.execPath,['scripts/gemini-live-smoke.mjs'],{env,encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/setup FAIL/);assert.doesNotMatch(result.stdout+result.stderr,/private-fixture/);
});
