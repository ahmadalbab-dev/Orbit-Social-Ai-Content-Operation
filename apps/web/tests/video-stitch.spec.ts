import {expect,test,type Page} from '@playwright/test';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {selectEditorTool} from './editor-helpers';
const fixture=(name:string)=>join(__dirname,'fixtures',`stitch-${name}.mp4`);
async function colour(page:Page){return page.getByLabel('Edited video preview',{exact:true}).evaluate((canvas:HTMLCanvasElement)=>Array.from(canvas.getContext('2d')!.getImageData(canvas.width/2,canvas.height/2,1,1).data));}
async function prepare(page:Page){
 await page.goto('/preview/editor/video');await page.getByLabel('Choose video',{exact:true}).setInputFiles(fixture('response'));
 await selectEditorTool(page,'Video','Adjust & text');await page.getByLabel('Trim length seconds',{exact:true}).fill('1.2');
 await selectEditorTool(page,'Video','Layers');await page.getByLabel('Choose stitch reference video',{exact:true}).setInputFiles(fixture('reference'));
 await expect(page.getByLabel('Stitch reference length',{exact:true})).not.toHaveValue('0');
 await page.getByLabel('Stitch reference start',{exact:true}).fill('.1');await page.getByLabel('Stitch reference length',{exact:true}).fill('.8');
}
test('sequential stitch exports both actual clips and their source audio in order without uploads',async({page})=>{
 test.setTimeout(60000);const posts:string[]=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
 await prepare(page);await page.getByRole('button',{name:'Preview stitched sequence',exact:true}).click();
 await expect.poll(async()=>(await colour(page))[2]).toBeGreaterThan(180);
 await expect.poll(async()=>(await colour(page))[0],{timeout:5000}).toBeGreaterThan(180);
 await page.getByRole('button',{name:'Apply stitch',exact:true}).click();
 await selectEditorTool(page,'Video','Export');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();
 const bytes=await readFile((await(await pending).path())!);
 const result=await page.evaluate(async base64=>{
  const bytes=Uint8Array.from(atob(base64),character=>character.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:bytes[4]===102?'video/mp4':'video/webm'}));
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=url;document.body.append(video);
  const audio=new AudioContext();try{
   await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(Error('Stitch export cannot decode'));});
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const context=canvas.getContext('2d')!;
   async function sample(time:number){const seek=new Promise<void>(resolve=>{video.onseeked=()=>resolve();});video.currentTime=time;await seek;context.drawImage(video,0,0,320,180);return Array.from(context.getImageData(160,90,1,1).data);}
   const first=await sample(.25),second=await sample(1.3);
   const sound=await audio.decodeAudioData(bytes.buffer.slice(0)),samples=sound.getChannelData(0);
   function band(frequency:number,from:number,to:number){const start=Math.floor(from*sound.sampleRate),end=Math.min(samples.length,Math.floor(to*sound.sampleRate));let sine=0,cosine=0;for(let index=start;index<end;index++){const angle=2*Math.PI*frequency*index/sound.sampleRate;sine+=samples[index]*Math.sin(angle);cosine+=samples[index]*Math.cos(angle);}return 2*Math.hypot(sine,cosine)/Math.max(1,end-start);}
   return {first,second,width:video.videoWidth,height:video.videoHeight,duration:sound.duration,first440:band(440,.15,.5),first880:band(880,.15,.5),second440:band(440,1.15,1.6),second880:band(880,1.15,1.6)};
  }finally{video.remove();URL.revokeObjectURL(url);await audio.close();}
 },bytes.toString('base64'));
 expect(result.width).toBe(320);expect(result.height).toBe(180);expect(result.duration).toBeGreaterThan(1.7);expect(result.duration).toBeLessThan(2.5);
 expect(result.first[2]).toBeGreaterThan(180);expect(result.first[0]).toBeLessThan(50);expect(result.second[0]).toBeGreaterThan(180);expect(result.second[2]).toBeLessThan(50);
 expect(result.first440).toBeGreaterThan(.03);expect(result.first440).toBeGreaterThan(result.first880*4);expect(result.second880).toBeGreaterThan(.03);expect(result.second880).toBeGreaterThan(result.second440*4);
 await selectEditorTool(page,'Video','Layers');await page.getByRole('button',{name:'Undo stitch',exact:true}).click();await expect(page.getByRole('button',{name:'Remove stitch',exact:true})).toHaveCount(0);
 expect(posts).toEqual([]);
});
test('invalid reference timing, cancellation and response replacement keep stitch state bounded',async({page})=>{
 test.setTimeout(45000);await prepare(page);
 await page.getByLabel('Stitch reference length',{exact:true}).fill('31');await expect(page.getByRole('button',{name:'Apply stitch',exact:true})).toBeDisabled();
 await page.getByLabel('Stitch reference length',{exact:true}).fill('.8');await page.getByRole('button',{name:'Apply stitch',exact:true}).click();
 await selectEditorTool(page,'Video','Export');let downloads=0;page.on('download',()=>downloads++);
 await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();await expect(page.getByLabel('Local video export progress',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cancel local export',exact:true}).click();await expect(page.getByRole('button',{name:'Export edited video locally',exact:true})).toBeEnabled();expect(downloads).toBe(0);
 await selectEditorTool(page,'Video','Media');await page.getByLabel('Choose video',{exact:true}).setInputFiles(fixture('response'));
 await selectEditorTool(page,'Video','Layers');await expect(page.getByLabel('Stitch reference start',{exact:true})).toHaveCount(0);
});
