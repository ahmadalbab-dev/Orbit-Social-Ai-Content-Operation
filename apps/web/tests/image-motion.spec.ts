import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { selectEditorTool } from './editor-helpers';
test('customer motion instruction previews actual pixels and exports a moving image movie without provider calls', async ({ page }) => {
  const posts: string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
  await page.goto('/preview/editor/image');
  const bytes=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d')!;x.fillStyle='#fff';x.fillRect(0,0,200,200);x.fillStyle='#f00';x.fillRect(60,60,80,80);return c.toDataURL().split(',')[1];});
  await page.getByLabel('Choose image',{exact:true}).setInputFiles({name:'motion.png',mimeType:'image/png',buffer:Buffer.from(bytes,'base64')});
  const original=await page.getByLabel('Edited image preview',{exact:true}).evaluate(node=>(node as HTMLCanvasElement).toDataURL());
  await selectEditorTool(page,'Image','AI editor');
  await page.getByLabel('AI image editing instruction',{exact:true}).fill('Make the screen moving');
  await page.getByRole('button',{name:'Prepare AI edit',exact:true}).click();
  await expect(page.getByLabel('Image movie motion',{exact:true})).toHaveValue('zoom-in');
  const canvas=page.getByLabel('Edited image preview',{exact:true});
  const first=await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL());
  await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).not.toBe(first);
  await selectEditorTool(page,'Image','Layers');
  await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).toBe(original);
  await selectEditorTool(page,'Image','Music');
  await expect(page.getByRole('button',{name:'Preview image motion',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo image motion',exact:true}).click();
  await expect(page.getByLabel('Image movie motion',{exact:true})).toHaveValue('none');
  await page.getByRole('button',{name:'Undo image motion',exact:true}).click();
  await expect(page.getByLabel('Image movie motion',{exact:true})).toHaveValue('zoom-in');
  await page.getByLabel('Image movie seconds per slide',{exact:true}).fill('1');
  // Follow exportCanvasMovie's actual guards: this WebKit build can expose
  // captureStream even when MediaRecorder itself is unavailable.
  const unsupported=await page.evaluate(()=>{
    if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return 'Video export requires a current Chrome or Safari browser.';
    if(!['video/mp4','video/webm;codecs=vp8,opus','video/webm'].some(type=>MediaRecorder.isTypeSupported(type)))return 'Video encoding is unavailable.';
    return null;
  });
  if(unsupported){
    await page.getByRole('button',{name:'Export image movie',exact:true}).click();
    await expect(page.getByText(unsupported,{exact:true})).toBeVisible();
    expect(posts).toEqual([]);
    return;
  }
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export image movie',exact:true}).click();
  const file=await download;const movie=await readFile((await file.path())!);
  expect(movie.length).toBeGreaterThan(100);
  const frames=await page.evaluate(async ({data,mime})=>{
    const blob=new Blob([Uint8Array.from(atob(data),v=>v.charCodeAt(0))],{type:mime}),url=URL.createObjectURL(blob),v=document.createElement('video');v.muted=true;v.src=url;
    try{await new Promise<void>((resolve,reject)=>{v.onloadeddata=()=>resolve();v.onerror=()=>reject(Error('Export decode failed'));});const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d')!;const snapshots:string[]=[];for(const time of [.05,.8]){await new Promise<void>(resolve=>{v.onseeked=()=>resolve();v.currentTime=time;});x.drawImage(v,0,0,200,200);snapshots.push(c.toDataURL());}return snapshots;}finally{v.removeAttribute('src');v.load();URL.revokeObjectURL(url);}
  },{data:movie.toString('base64'),mime:file.suggestedFilename().endsWith('.mp4')?'video/mp4':'video/webm'});
  expect(frames[0]).not.toBe(frames[1]);
  expect(posts).toEqual([]);
});
test('pixel editing instruction opens the actual image engine panel without a text-planner or media upload', async ({page})=>{
  const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
  await page.goto('/preview/editor/image');
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=20;c.getContext('2d')!.fillRect(0,0,20,20);return c.toDataURL().split(',')[1];});
  await page.getByLabel('Choose image',{exact:true}).setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  await selectEditorTool(page,'Image','AI editor');
  const brief='Turn this image into a commercial product named ai studio by Orbit';
  await page.getByLabel('AI image editing instruction',{exact:true}).fill(brief);
  await page.getByRole('button',{name:'Prepare AI edit',exact:true}).click();
  await expect(page.getByLabel('AI image edit instruction',{exact:true})).toHaveValue(brief);
  await expect(page.getByRole('button',{name:'Edit image with AI',exact:true})).toBeDisabled();
  await expect(page.getByText('Sign in to use AI image editing.',{exact:true})).toBeVisible();
  expect(posts).toEqual([]);
});
