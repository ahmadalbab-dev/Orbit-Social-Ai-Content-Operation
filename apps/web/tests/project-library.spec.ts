import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

async function create(page:Page){await page.goto('/preview/projects');await page.getByLabel('New project name').fill('Launch collection');await page.getByRole('button',{name:'Create project',exact:true}).click();await expect(page.getByRole('heading',{name:'Launch collection',exact:true})).toBeVisible();}
async function imageFile(page:Page){return {name:'original.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#246842';ctx.fillRect(0,0,120,80);return canvas.toDataURL().split(',')[1];}),'base64')};}
test('project originals survive reload, deduplicate, open in the image editor and export real pixels',async({page})=>{
  await create(page);const file=await imageFile(page);await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('status')).toContainText('Original saved');
  await page.locator('input[type=file]').setInputFiles(file);await expect(page.getByRole('status')).toContainText('already in');
  await expect(page.locator('.source-card')).toHaveCount(1);
  await page.reload();await page.getByRole('button',{name:/Launch collection.*revision 2/}).click();await expect(page.locator('.source-card')).toHaveCount(1);
  await page.getByRole('link',{name:'Open image editor'}).click();
  const canvas=page.getByLabel('Edited image preview',{exact:true});
  await expect.poll(()=>canvas.evaluate(node=>{const c=node as HTMLCanvasElement;return c.width===120?Array.from(c.getContext('2d')!.getImageData(60,40,1,1).data):[];})).toEqual([36,104,66,255]);
  await page.getByRole('navigation',{name:'Image editing tools'}).getByRole('button',{name:'Export',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export image',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await page.reload();await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).width)).toBe(120);
});
test('project video source opens with decoded metadata',async({page})=>{
  await create(page);await page.locator('input[type=file]').setInputFiles(join(__dirname,'fixtures','clip.mp4'));await expect(page.getByRole('status')).toContainText('Original saved');await page.getByRole('link',{name:'Open video editor'}).click();await expect.poll(()=>page.locator('video').first().evaluate(node=>(node as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
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
  for(const mode of ['Light','Dark']){await page.getByRole('button',{name:`${mode} mode`,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`projects-phone-${mode}.png`),fullPage:true});}
});
test('brand uses the connecting orb and respects device reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/preview/projects');const mark=page.locator('.project-header [data-orbit-mark="connecting"] canvas');
  await expect.poll(()=>mark.evaluate(node=>{const c=node as HTMLCanvasElement;return c.width>0&&Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data).some((value,i)=>i%4===3&&value>0);})).toBe(true);
  const before=await mark.evaluate(node=>(node as HTMLCanvasElement).toDataURL());await page.waitForTimeout(200);expect(await mark.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).toBe(before);
});
