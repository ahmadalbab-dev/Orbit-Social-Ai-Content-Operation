import {test} from "node:test";
import assert from "node:assert/strict";
import {seal,unseal,randomToken,hash,sameOrigin,validProvider,boundedForm} from "./oauth-security.ts";
test("encrypted credentials bind ciphertext to owner and provider",async()=>{const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));const a=await seal("secret",key,"owner:meta"),b=await seal("secret",key,"owner:meta");assert.notEqual(a,b);assert.equal(await unseal(a,key,"owner:meta"),"secret");await assert.rejects(()=>unseal(a,key,"other:meta"));await assert.rejects(()=>unseal(a.slice(0,-2)+"xx",key,"owner:meta"));});
test("OAuth nonces are random and hashed before storage",async()=>{const a=randomToken(),b=randomToken();assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.notEqual(await hash(a),a);});
test("write requests reject CSRF origins and unknown providers",()=>{assert.equal(sameOrigin(new Request("https://orbit.test/start",{method:"POST",headers:{Origin:"https://bad.test"}}),"https://orbit.test"),false);assert.equal(sameOrigin(new Request("https://orbit.test/start",{method:"POST",headers:{Origin:"https://orbit.test"}}),"https://orbit.test"),true);assert.equal(validProvider("evil"),false);});

test("credential forms stop reading oversized bodies",async()=>{assert.equal((await boundedForm(new Request("https://orbit.test/setup",{method:"POST",body:"secret=value"}))).get("secret"),"value");await assert.rejects(()=>boundedForm(new Request("https://orbit.test/setup",{method:"POST",body:"x".repeat(2049)})));});
