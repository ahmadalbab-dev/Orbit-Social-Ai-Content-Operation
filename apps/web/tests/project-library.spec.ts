import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

async function create(page:Page){await page.goto('/preview/projects');await page.getByLabel('New project name').fill('Launch collection');await page.getByRole('button',{name:'Create project',exact:true}).click();await expect(page.getByRole('heading',{name:'Launch collection',exact:true})).toBeVisible();}
async function imageFile(page:Page){return {name:'original.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#246842';ctx.fillRect(0,0,120,80);return canvas.toDataURL().split(',')[1];}),'base64')};}
test('project originals survive reload, deduplicate, open in the image editor and export real pixels',async({page},testInfo)=>{
  await create(page);const file=await imageFile(page);await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('status')).toContainText('Original saved');
  await page.locator('input[type=file]').setInputFiles(file);await expect(page.getByRole('status')).toContainText('already in');
  await expect(page.locator('.source-card')).toHaveCount(1);
  await page.screenshot({path:testInfo.outputPath('projects-desktop.png'),fullPage:true});
  await page.reload();await page.getByRole('button',{name:/Launch collection.*revision 2/}).click();await expect(page.locator('.source-card')).toHaveCount(1);
  await page.getByRole('link',{name:'Open image editor'}).click();
  const canvas=page.getByLabel('Edited image preview',{exact:true});
  await expect.poll(()=>canvas.evaluate(node=>{const c=node as HTMLCanvasElement;return c.width===120?Array.from(c.getContext('2d')!.getImageData(60,40,1,1).data):[];})).toEqual([36,104,66,255]);
  await page.getByRole('navigation',{name:'Image editing tools'}).getByRole('button',{name:'Export',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export image',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await page.reload();await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).width)).toBe(120);
});
test('project video source restores with metadata or an explicit unsupported-codec message',async({page})=>{
  await create(page);
  // canPlayType reports support on Windows WebKit even when its decoder fails.
  // Decode the untouched fixture independently, before testing the project path.
  const bytes=await readFile(join(__dirname,'fixtures','clip.mp4'));
  await page.route('**/codec-control.mp4',route=>route.fulfill({contentType:'video/mp4',body:bytes}));
  const supported=await page.evaluate(()=>new Promise<boolean>(resolve=>{const v=document.createElement('video');v.preload='auto';let done=false;const finish=(value:boolean)=>{if(done)return;done=true;clearTimeout(timer);v.removeAttribute('src');v.load();resolve(value);};const timer=setTimeout(()=>finish(false),4000);v.onloadedmetadata=()=>finish(v.videoWidth>0);v.onerror=()=>finish(false);v.src='/codec-control.mp4';v.load();}));
  await page.locator('input[type=file]').setInputFiles(join(__dirname,'fixtures','clip.mp4'));await expect(page.getByRole('status')).toContainText('Original saved');await page.getByRole('link',{name:'Open video editor'}).click();
  if(supported)await expect.poll(()=>page.locator('video').first().evaluate(node=>(node as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
  else{await expect(page.getByText('This browser cannot preview this file. Try an MP4 with H.264 video.',{exact:true})).toBeVisible();await expect(page.getByText(/clip\.mp4.*On your device/)).toBeVisible();}
});
test('stale imports cannot overwrite another tab and deletion removes original blobs',async({page,context})=>{
  await create(page);const file=await imageFile(page),other=await context.newPage();await other.goto('/preview/projects');await other.getByRole('button',{name:/Launch collection/}).click();
  await page.locator('input[type=file]').setInputFiles(file);await expect(page.getByRole('status')).toContainText('Original saved');
  await other.locator('input[type=file]').setInputFiles(file);await expect(other.getByRole('status')).toContainText('another tab');
  await expect(other.locator('.source-card')).toHaveCount(1);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete project',exact:true}).click();await expect(page.getByRole('status')).toContainText('deleted');
  expect(await page.evaluate(()=>new Promise<number>((resolve,reject)=>{const r=indexedDB.open('orbit-device-projects-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('files'),count=tx.objectStore('files').count();count.onsuccess=()=>resolve(count.result);tx.oncomplete=()=>db.close();};}))).toBe(0);
});
test('filters support keyboard, both themes and a narrow phone',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await create(page);await page.locator('input[type=file]').setInputFiles(await imageFile(page));await expect(page.getByRole('status')).toContainText('Original saved');
  await page.getByRole('tab',{name:'All media',exact:true}).focus();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Audio',exact:true})).toBeFocused();await expect(page.locator('.source-card')).toHaveCount(0);await page.keyboard.press('Home');await expect(page.locator('.source-card')).toHaveCount(1);
  for(const mode of ['Light','Dark']){await page.getByRole('button',{name:`${mode} mode`,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const contrast=await page.getByRole('button',{name:'Import media',exact:true}).evaluate(node=>{const s=getComputedStyle(node),luminance=(colour:string)=>{const rgb=colour.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;},a=luminance(s.color),b=luminance(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);await page.screenshot({path:testInfo.outputPath(`projects-phone-${mode}.png`),fullPage:true});}
});
test('brand uses the connecting orb and respects device reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/preview/projects');const mark=page.locator('.project-header [data-orbit-mark="connecting"] canvas');
  await expect.poll(()=>mark.evaluate(node=>{const c=node as HTMLCanvasElement;return c.width>0&&Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data).some((value,i)=>i%4===3&&value>0);})).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-motion','paused');
  // Let the package's client theme/reduced-motion effects settle before comparing frames.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const before=await mark.evaluate(node=>(node as HTMLCanvasElement).toDataURL());await page.waitForTimeout(200);expect(await mark.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).toBe(before);
});
test('source preview and tab selection remain accessible and aligned',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await create(page);await page.locator('input[type=file]').setInputFiles(await imageFile(page));await expect(page.getByRole('status')).toContainText('Original saved');
  await page.getByRole('button',{name:'Preview original.png',exact:true}).click();const preview=page.getByRole('region',{name:'Source preview'});await expect(preview).toBeVisible();await expect(preview).not.toHaveAttribute('inert','');await expect(preview.locator('img')).toBeVisible();
  const pill=page.locator('.t-tabs-pill'),tab=page.getByRole('tab',{name:'Videos',exact:true}),before=(await tab.boundingBox())!;
  await tab.click();
  await expect.poll(async()=>{const p=(await pill.boundingBox())!,t=(await tab.boundingBox())!;return Math.abs(p.x-t.x)<1&&Math.abs(p.width-t.width)<1;}).toBe(true);expect((await tab.boundingBox())!.x).toBe(before.x);
});
