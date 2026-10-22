// Explicit preview-only probe using public synthetic input. No key/output logging.
import {createRequire} from 'node:module';
if(process.env.VERCEL_ENV!=='preview'||!process.env.GEMINI_API_KEY){console.error('ORBIT_GEMINI_SMOKE setup FAIL');process.exit(1);}
const ai=createRequire(new URL('../apps/api/package.json',import.meta.url))('@sma/ai');
const key=process.env.GEMINI_API_KEY,model=process.env.GEMINI_TEXT_MODEL??ai.DEFAULT_GEMINI_TEXT_MODEL;
const tests=[
 ['studio',()=>new ai.GeminiContentProvider(new ai.MemoryUsageStore(),{apiKey:key,model,maxOutputTokens:1500}).generateVariants({workspaceId:'synthetic-smoke',brandName:'Orbit demo',voice:'Clear',audience:'Creators',topic:'Write a short Malay caption about a reusable water bottle. Do not invent claims.',platforms:['facebook']})],
 ['image-editor',()=>new ai.EditorPlanner(key,'gemini',model).plan({kind:'image',instruction:'Set brightness to 110. Keep other settings.',current:{brightness:100}})],
 ['video-editor',()=>new ai.GeminiVideoPlanner(key,model).plan({brief:'A five-second product demo of a reusable water bottle. Suggested captions only.',duration:5})],
];
for(const[name,run]of tests){
 try{await run();console.log(`ORBIT_GEMINI_SMOKE ${name} PASS`);}
 catch(error){process.exitCode=1;console.log(`ORBIT_GEMINI_SMOKE ${name} FAIL ${error instanceof ai.AiProviderError?error.code:'unexpected'}`);}
}
