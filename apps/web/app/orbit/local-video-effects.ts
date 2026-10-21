/** Bounded, deterministic local effect. No segmentation, provider or remote media. */
export type LightningEffect = { at: number; intensity: number; thunderDelay: number; thunderVolume: number; seed: number };
export function validateLightning(effect: LightningEffect, outputDuration: number) {
 if (![effect.at,effect.intensity,effect.thunderDelay,effect.thunderVolume,effect.seed,outputDuration].every(Number.isFinite) || outputDuration < .5 || effect.at < 0 || effect.at + .24 > outputDuration || effect.intensity < .1 || effect.intensity > .8 || effect.thunderDelay < 0 || effect.thunderDelay > .5 || effect.at + effect.thunderDelay >= outputDuration || effect.thunderVolume < 0 || effect.thunderVolume > .6 || !Number.isInteger(effect.seed) || effect.seed < 1 || effect.seed > 65535) throw new Error("Lightning timing must fit the output clip, with bounded brightness and thunder volume.");
}
export function lightningRecipe(outputDuration: number): LightningEffect {
 const effect={at:Math.min(1,Math.max(.05,outputDuration*.25)),intensity:.55,thunderDelay:.12,thunderVolume:.35,seed:173};
 validateLightning(effect,outputDuration);return effect;
}
function random(seed:number){let state=seed;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function lightningEnvelope(effect:LightningEffect,elapsed:number){const local=elapsed-effect.at;if(local<0||local>=.24)return 0;return local<.09?Math.sin(Math.PI*local/.09):local<.14?0:.65*Math.sin(Math.PI*(local-.14)/.1);}
export function lightningPoints(seed:number,width:number,height:number){const next=random(seed);let x=width*(.55+next()*.18);return Array.from({length:10},(_,i)=>{x=Math.max(width*.1,Math.min(width*.9,x+(next()-.5)*width*.15));return{x,y:height*i/10};});}
export function drawLightning(ctx:CanvasRenderingContext2D,effect:LightningEffect,elapsed:number,width:number,height:number){
 const pulse=lightningEnvelope(effect,elapsed);if(pulse<=0)return;
 const points=lightningPoints(effect.seed,width,height);ctx.save();ctx.globalAlpha=pulse*effect.intensity;ctx.fillStyle="#e9edff";ctx.fillRect(0,0,width,height);ctx.globalAlpha=pulse;ctx.lineJoin="round";ctx.lineCap="round";ctx.shadowBlur=Math.max(4,width*.018);ctx.shadowColor="#b7b8ff";ctx.strokeStyle="#f8f7ff";ctx.lineWidth=Math.max(2,width*.004);ctx.beginPath();points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke();ctx.restore();
}
/** Seeded, filtered noise with a short crack and a low rumble; samples stay within [-1,1]. */
export function thunderSamples(sampleRate:number,seed:number,seconds=1.25){
 if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isFinite(seconds)||seconds<=0||seconds>2)throw new Error("Unsupported thunder buffer size.");
 const samples=new Float32Array(Math.ceil(sampleRate*seconds)),next=random(seed);let low=0;
 for(let i=0;i<samples.length;i++){const t=i/sampleRate,noise=next()*2-1;low=low*.94+noise*.06;const attack=Math.min(1,t/.008),decay=Math.exp(-t*4);samples[i]=Math.max(-1,Math.min(1,(low*3.8+noise*.45*Math.exp(-t*35))*attack*decay));}
 return samples;
}
export function scheduleThunder(context:AudioContext,effect:LightningEffect,destination:AudioNode,elapsed:number,outputDuration:number){
 const onset=effect.at+effect.thunderDelay,offset=Math.max(0,elapsed-onset),duration=Math.min(1.25,outputDuration-onset);
 if(effect.thunderVolume<=0||duration<=0||offset>=duration)return()=>{};
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);buffer.getChannelData(0).set(thunderSamples(context.sampleRate,effect.seed,duration));
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=effect.thunderVolume;source.connect(gain);gain.connect(destination);source.start(context.currentTime+Math.max(0,onset-elapsed),offset,duration-offset);
 return()=>{try{source.stop();}catch{}source.disconnect();gain.disconnect();};
}
