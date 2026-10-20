import {expect,test} from '@playwright/test';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {selectEditorTool} from './editor-helpers';
import {toneWav} from './audio-fixtures';

for(const speed of [1,2])test(`local lightning + thunder survive actual export at speed ${speed} without provider calls`,async({page})=>{
 test.setTimeout(60000);const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/preview/editor/video');await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','clip.mp4'));
 await selectEditorTool(page,'Video','Adjust & text');await page.getByLabel('Video speed',{exact:true}).selectOption(String(speed));
 await page.getByLabel('Video volume',{exact:true}).focus();await page.getByLabel('Video volume',{exact:true}).press('Home');
 if(speed===2){
  await selectEditorTool(page,'Video','Music');
  await page.locator('.video-composer').getByLabel('Choose local music',{exact:true}).setInputFiles({name:'retained-music.wav',mimeType:'audio/wav',buffer:toneWav()});
  await page.locator('.video-composer').getByLabel('Soundtrack fadeIn',{exact:true}).fill('0');
  await page.locator('.video-composer').getByLabel('Soundtrack fadeOut',{exact:true}).fill('0');
 }
 await selectEditorTool(page,'Video','AI editor');await page.getByRole('button',{name:'Prepare lightning + thunder',exact:true}).click();
 await expect(page.getByRole('region',{name:'Lightning proposal',exact:true})).toBeVisible();
 // Preview is explicit and temporary. Applying is a distinct operation.
 await page.getByRole('button',{name:'Preview lightning + thunder',exact:true}).click();
 await expect(page.getByRole('button',{name:'Pause video preview',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop effect preview',exact:true}).click();
 await page.getByRole('button',{name:'Apply lightning + thunder',exact:true}).click();
 await expect(page.getByText('Lightning + synthesized thunder active.',{exact:true})).toBeVisible();
 await selectEditorTool(page,'Video','Export');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();
 const bytes=await readFile((await (await pending).path())!);
 const result=await page.evaluate(async({base64,speed})=>{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:bytes[4]===102?'video/mp4':'video/webm'}),url=URL.createObjectURL(blob);
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=url;video.preload='auto';document.body.append(video);
  const audio=new AudioContext();try{
   await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(new Error('Export cannot decode'));});
   const context=document.createElement('canvas');context.width=160;context.height=90;const ctx=context.getContext('2d')!;
   async function brightness(time:number){video.currentTime=time;await new Promise<void>(resolve=>video.onseeked=()=>resolve());ctx.drawImage(video,0,0,160,90);const pixels=ctx.getImageData(0,0,160,90).data;let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;return sum/(pixels.length/4);}
   const outputDuration=2/speed,at=Math.min(1,outputDuration*.25),before=await brightness(.05),flash=await brightness(at+.045);
   const sound=await audio.decodeAudioData(bytes.buffer.slice(0)),values=sound.getChannelData(0);
   const rms=(from:number,to:number)=>{const start=Math.floor(from*sound.sampleRate),end=Math.min(values.length,Math.floor(to*sound.sampleRate));let energy=0;for(let i=start;i<end;i++)energy+=values[i]*values[i];return Math.sqrt(energy/Math.max(1,end-start));};
   const band=(from:number,to:number)=>{const start=Math.floor(from*sound.sampleRate),end=Math.min(values.length,Math.floor(to*sound.sampleRate)),count=end-start;let sine=0,cosine=0;
    for(let i=start;i<end;i++){const angle=2*Math.PI*880*i/sound.sampleRate;sine+=values[i]*Math.sin(angle);cosine+=values[i]*Math.cos(angle);}
    const amplitude=2*Math.hypot(sine,cosine)/count;return{amplitude,residual:Math.sqrt(Math.max(0,rms(from,to)**2-amplitude**2/2))};};
   return{before,flash,early:rms(0,.1),thunder:rms(at+.14,Math.min(outputDuration,at+.45)),musicBefore:band(.04,.2),musicDuring:band(at+.14,Math.min(outputDuration,at+.45)),duration:video.duration};
  }finally{video.remove();URL.revokeObjectURL(url);await audio.close();}
 },{base64:bytes.toString('base64'),speed});
 expect(result.flash).toBeGreaterThan(result.before+8);expect(result.thunder).toBeGreaterThan(.005);if(speed===1)expect(result.thunder).toBeGreaterThan(result.early*2);else{expect(result.musicBefore.amplitude).toBeGreaterThan(.05);expect(result.musicDuring.amplitude).toBeGreaterThan(.05);expect(result.musicDuring.residual).toBeGreaterThan(result.musicBefore.residual+.003);}expect(result.duration).toBeGreaterThan(2/speed-.3);
 await selectEditorTool(page,'Video','AI editor');await page.getByRole('button',{name:'Undo lightning edit',exact:true}).click();await expect(page.getByText('Lightning + synthesized thunder active.',{exact:true})).toHaveCount(0);expect(posts).toEqual([]);
});


test('stopping a temporary lightning preview leaves an ordinary export without the proposed effect',async({page})=>{
 test.setTimeout(60000);
 const posts:string[]=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
 await page.goto('/preview/editor/video');
 await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','clip.mp4'));
 await selectEditorTool(page,'Video','AI editor');
 await page.getByRole('button',{name:'Prepare lightning + thunder',exact:true}).click();
 await page.getByRole('button',{name:'Preview lightning + thunder',exact:true}).click();
 await expect(page.getByRole('button',{name:'Pause video preview',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop effect preview',exact:true}).click();
 await expect(page.getByText('Lightning + synthesized thunder active.',{exact:true})).toHaveCount(0);
 await selectEditorTool(page,'Video','Export');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();
 const bytes=await readFile((await (await pending).path())!);
 const difference=await page.evaluate(async({exported,original})=>{
  async function brightness(base64:string){
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:bytes[4]===102?'video/mp4':'video/webm'}));
   const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=url;document.body.append(video);
   try{
    await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(new Error('Cannot decode video'));});
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d')!;
    const values:number[]=[];
    // Sample the entire flash window: a cancelled proposal must not remain in export.
    for(const time of [.51,.545,.575,.65,.7]){
     const seeked=new Promise<void>(resolve=>{video.onseeked=()=>resolve();});video.currentTime=time;await seeked;
     ctx.drawImage(video,0,0,160,90);const pixels=ctx.getImageData(0,0,160,90).data;let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;values.push(sum/(pixels.length/4));
    }
    return values;
   }finally{video.remove();URL.revokeObjectURL(url);}
  }
  const [after,before]=await Promise.all([brightness(exported),brightness(original)]);
  return Math.max(...after.map((value,index)=>Math.abs(value-before[index])));
 },{exported:bytes.toString('base64'),original:(await readFile(join(__dirname,'fixtures','clip.mp4'))).toString('base64')});
 expect(difference).toBeLessThan(6);expect(posts).toEqual([]);
});
