// Explicit opt-in only. Synthetic public fixtures; no prompts, keys or image bytes in logs.
import {createRequire} from 'node:module';
if(process.env.ORBIT_GATEWAY_SMOKE_ON_BUILD!=='true'||process.env.VERCEL_ENV!=='preview')throw Error('Gateway smoke requires explicit Preview opt-in');
const require=createRequire(new URL('../apps/api/package.json',import.meta.url));
const ai=require('@sma/ai'),{getVercelOidcToken}=require('@vercel/oidc');
const key=process.env.AI_GATEWAY_API_KEY||await getVercelOidcToken();
const model=process.env.AI_GATEWAY_MODEL??ai.DEFAULT_GATEWAY_MODEL;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const response=await originalFetch(...args);
 console.log(`ORBIT_GATEWAY_HTTP ${response.status}`);
 if(response.ok){
  const value=await response.clone().json();
  console.log('ORBIT_GATEWAY_USAGE '+JSON.stringify({id:value.id,model:value.model,usage:value.usage}));
 }
 return response;
};
const preview='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAE70lEQVR4nO3ZS3LbVhBA0cdU9r9lZRA7VoqiRPAHou85Yw+Afn0BUD59LOj6a+8LgD0JgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpf+99ASUfHxv+8en0tOvgj9OWM2GLTet+DUk8gQAe6uFLf4kYHkQAj/CyvT+nhPsI4A477v05JdxEADd5q9X/TAYbCWCLt937c0q4jgCuc6DV/0wGP/EfYVc46PavI1/5q3gDfGvMAnkVXCCAC8as/mcyOOMT6Csjt3/Nva87CODM7C2ZfXfb+QT6JLUcPofWWt4Af6S2f/Xu9wIBrLWq29C86/8TQHsPyve+1hKADYhPIPwjuH3wX0j+LK6+AWz/ueRMqgHAWisaQPJRd5XeZHoB9M54m9h8YgHETvdGpSmVAiid670ys8oEkDnRh2lMLBMAfKURQONh9niBuQUCCJziE02f3vQApp/fK4ye4fQA4FujAxj96HqpuZMcHQD8ZG4Acx9a+xg6z6EBDD2tnU2c6tAA4DoTA5j4oHoX42Y7MQC4mgBIGxfAuHf025k14XEBwBazApj1cHpfg+Y8KwDYSACkDQpg0Hv5AKZMe1AAsJ0ASJsSwJQ38pGMmPmUAOAmAiBNAKSNCGDEx+ghHX/yIwKAWwmANAGQJgDSBEDa8QM4/h8iju3g8z9+AHAHAZAmANIEQJoASBMAaQIgTQCkCYA0AZAmANIEQJoASBMAaccP4HTa+wraDj7/4wcAdxAAaQIgTQCkCYC0EQEc/A8RB3b8yY8IAG4lANIEQNqUAI7/MXo8I2Y+JQC4iQBIGxTAiDfyYUyZ9qAAYDsBkDYrgCnv5Xc3aM6zAoCNxgUw6OH0pmZNeFwAsIUASJsYwKx39HsZN9uJAcDVhgYw7kH1FiZOdWgAa+Zp7WnoPOcGAFcYHcDQh9YO5k5ydADwk+kBzH10vc7oGU4PYA0/v6ebPr1AAGv+KT5LYG6NAOCCTACBh9mDNSaWCWBVTvQxMrMqBbBC53qX0pRiAazW6d4iNp9eACt3xhv0JpMMAH6rBtB71P0sOZPTx95XsLOP+gDWiq7+v6pvgP+Ez/6X9gTyAaz2BpTvfa0lgF+ae9C86/8TwG+1bajd7wX5H8Hnxv8stvqfeAOcmb0fs+9uOwF8ZeqWTL2vO/gE+taYzyGrf4EArnDoDKz+t3wCXeG4O3TcK38Vb4AtDvQqsPrXEcBN3rYEe7+RAO7wVhlY/ZsI4BF2LMHe30cAD/WyEuz9gwjgaR4eg6V/AgG80KYkrPtLCIA0/xFGmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgLR/AFqIr9MHRt1rAAAAAElFTkSuQmCC';

const tests=[
 ['studio',()=>new ai.GatewayContentProvider(new ai.MemoryUsageStore(),{apiKey:key,model,maxOutputTokens:1500}).generateVariants({workspaceId:'synthetic-gateway-smoke',brandName:'Orbit demo',voice:'Clear',audience:'Creators',topic:'Write a short Malay caption about a reusable water bottle. Do not invent claims.',platforms:['facebook']})],
 ['image-editor',async()=>{const p=await new ai.EditorPlanner(key,'gateway',model).plan({kind:'image',instruction:'Set brightness to 90. Keep other settings.',current:{brightness:100},previewDataUrl:preview});if(p.changes.brightness!==90)throw Error('wrong_change');}],
 ['video-editor',()=>new ai.GatewayVideoPlanner(key,model).plan({brief:'A five-second product demo of a reusable water bottle. Suggested captions only.',duration:5})],
 ['image-pixels',async()=>{const r=await new ai.GatewayImageEditor(key).edit({imageDataUrl:preview,prompt:'Keep the white circle. Change the red background to blue. Return one edited image.'});if(r.bytes.length<100)throw Error('invalid_image');}],
];
for(const[name,run]of tests){try{await run();console.log(`ORBIT_GATEWAY_SMOKE ${name} PASS`);}catch(error){console.log(`ORBIT_GATEWAY_SMOKE ${name} FAIL ${error instanceof ai.AiProviderError?error.code:'unexpected'}`);process.exitCode=1;break;}}
