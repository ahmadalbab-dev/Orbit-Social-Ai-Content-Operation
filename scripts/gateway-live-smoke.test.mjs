import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gatewaySmokeEnabled} from './api-release.mjs';
test('Gateway smoke is opt-in and Preview-only',()=>{
 assert.equal(gatewaySmokeEnabled({}),false);
 assert.equal(gatewaySmokeEnabled({ORBIT_GATEWAY_SMOKE_ON_BUILD:'true',VERCEL_ENV:'preview'}),true);
 for(const VERCEL_ENV of ['production','development',undefined])assert.throws(()=>gatewaySmokeEnabled({ORBIT_GATEWAY_SMOKE_ON_BUILD:'true',VERCEL_ENV}));
});
