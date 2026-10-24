import {expect,test} from '@playwright/test';
import {selectEditorTool} from './editor-helpers';
for(const width of [320,390,1440])test(`AI chat composer stays usable in both themes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 let requests=0;
 await page.route('**/api/workspace/**',route=>{requests++;return route.abort();});
 await page.goto('/preview?view=studio');
 const chat=page.getByRole('region',{name:'What would you like to create? chat',exact:true});
 await expect(chat).toBeVisible();
 for(const theme of ['Dark','Light']){
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.getByRole('button',{name:`${theme} mode`,exact:true}).click();
  await expect(chat.getByRole('button',{name:'Find content ideas',exact:true})).toBeVisible();
  await chat.getByRole('button',{name:'Plan a short video',exact:true}).click();
  await expect(chat.getByRole('combobox',{name:'AI content task'})).toHaveValue('script');
  await expect(chat.getByRole('button',{name:'Generate AI content'})).toBeDisabled();
  const box=await chat.boundingBox();expect(box!.width).toBeGreaterThan(200);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`studio-chat-${width}-${theme}.png`),fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(requests).toBe(0);
 await page.goto('/preview/editor/image');
 await selectEditorTool(page,'Image','AI editor');
 await expect(page.getByRole('region',{name:'Describe it. Shape your edit. chat',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'AI image editing instruction',exact:true}).fill('Use a warm editorial colour palette');
 expect(requests).toBe(0);
 await page.screenshot({path:test.info().outputPath(`ai-chat-${width}.png`),fullPage:true});
});
