import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { selectEditorTool } from './editor-helpers';
async function previewPixels(page: Page) {
  return page.getByLabel('Edited video preview', {exact:true}).evaluate((element: HTMLCanvasElement) => {
    const context=element.getContext('2d')!;
    return {background:Array.from(context.getImageData(20,element.height-20,1,1).data),subject:Array.from(context.getImageData(element.width/2,element.height*.75,1,1).data)};
  });
}
test('green screen previews, applies, exports actual keyed pixels and supports undo without uploads', async ({page}) => {
  test.setTimeout(60000);
  const posts:string[]=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  await page.goto('/preview/editor/video');
  await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','chroma.mp4'));
  await expect.poll(async()=>(await previewPixels(page)).background[1]).toBeGreaterThan(200);
  await selectEditorTool(page,'Video','Layers');
  await page.getByLabel('Green-screen background colour',{exact:true}).fill('#0000ff');
  await page.getByRole('button',{name:'Preview green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[2]).toBeGreaterThan(200);
  await expect.poll(async()=>(await previewPixels(page)).background[1]).toBeLessThan(30);
  expect((await previewPixels(page)).subject[0]).toBeGreaterThan(200);
  await selectEditorTool(page,'Video','Export');
  await expect(page.getByRole('button',{name:'Export edited video locally',exact:true})).toBeDisabled();
  await selectEditorTool(page,'Video','Layers');
  await page.getByRole('button',{name:'Stop green-screen preview',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[1]).toBeGreaterThan(200);
  await page.getByRole('button',{name:'Apply green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[2]).toBeGreaterThan(200);
  await selectEditorTool(page,'Video','Adjust & text');
  await page.getByLabel('Video volume',{exact:true}).focus();await page.getByLabel('Video volume',{exact:true}).press('Home');
  await selectEditorTool(page,'Video','Export');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();
  const bytes=await readFile((await(await pending).path())!);
  const result=await page.evaluate(async base64=>{
    const data=Uint8Array.from(atob(base64),character=>character.charCodeAt(0)),url=URL.createObjectURL(new Blob([data],{type:data[4]===102?'video/mp4':'video/webm'}));
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=url;document.body.append(video);
    try{
      await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(Error('Export could not be decoded'));});
      const ready=new Promise<void>(resolve=>{video.onseeked=()=>resolve();});video.currentTime=.4;await ready;
      const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;const context=canvas.getContext('2d')!;context.drawImage(video,0,0);
      return {width:video.videoWidth,height:video.videoHeight,duration:video.duration,background:Array.from(context.getImageData(20,canvas.height-20,1,1).data),subject:Array.from(context.getImageData(canvas.width/2,canvas.height*.75,1,1).data)};
    }finally{video.remove();URL.revokeObjectURL(url);}
  },bytes.toString('base64'));
  expect(result.width).toBe(320);expect(result.height).toBe(180);expect(result.duration).toBeGreaterThan(1.1);
  expect(result.background[2]).toBeGreaterThan(170);expect(result.background[1]).toBeLessThan(50);expect(result.subject[0]).toBeGreaterThan(170);
  await selectEditorTool(page,'Video','Layers');await page.getByRole('button',{name:'Undo green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[1]).toBeGreaterThan(200);
  expect(posts).toEqual([]);
});

test('green screen can use a retained image layer as background and resets on source replacement',async({page})=>{
  await page.goto('/preview/editor/video');await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','chroma.mp4'));
  await selectEditorTool(page,'Video','Layers');
  const blue=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const context=canvas.getContext('2d')!;context.fillStyle='#0000ff';context.fillRect(0,0,64,64);return canvas.toDataURL('image/png').split(',')[1];});
  await page.getByLabel('Add video image overlays',{exact:true}).setInputFiles({name:'background.png',mimeType:'image/png',buffer:Buffer.from(blue,'base64')});
  await expect(page.getByLabel('Layer 1 width',{exact:true})).toBeVisible();
  await page.getByLabel('Green-screen background image',{exact:true}).selectOption({label:'Image layer 1'});
  await page.getByRole('button',{name:'Apply green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[2]).toBeGreaterThan(200);
  await page.getByRole('button',{name:'Remove green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[1]).toBeGreaterThan(200);
  await page.getByRole('button',{name:'Undo green screen',exact:true}).click();
  await expect.poll(async()=>(await previewPixels(page)).background[2]).toBeGreaterThan(200);
  await selectEditorTool(page,'Video','Media');await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','chroma.mp4'));
  await selectEditorTool(page,'Video','Layers');await expect(page.getByRole('button',{name:'Remove green screen',exact:true})).toHaveCount(0);
});
