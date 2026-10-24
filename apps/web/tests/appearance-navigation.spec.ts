import { expect, test } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

test("light default keeps the auth form compact while widening only the hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const form = await page
    .getByRole("form", { name: "Sign in to Orbit" })
    .boundingBox();
  const hero = await page.locator(".auth-orbit-visual").boundingBox();
  expect(form?.width).toBeLessThanOrEqual(400);
  expect(hero!.width).toBeGreaterThan(900);
  const artwork = page.locator(".auth-orbit-visual canvas");
  await expect(artwork).toHaveAttribute("data-scene", "orbit");
  await expect(artwork).toHaveAttribute("data-scene", "ai-studio", { timeout: 12000 });
  await expect(page.locator(".orbit-ai-signature")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('desktop navigation hides on scroll and opens an accessible bottom-right menu', async ({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/preview');
  const nav=page.getByRole('navigation',{name:'Workspace',exact:true});
  await expect(nav.getByRole('button')).toHaveCount(6);
  await expect(page.locator('.current-workspace-name')).toHaveText('Preview workspace');
  await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
  const launcher=page.getByRole('button',{name:'Open navigation',exact:true});
  await expect(launcher).toBeVisible();await expect(launcher).toHaveAttribute('aria-expanded','false');
  const box=(await launcher.boundingBox())!;expect(box.x).toBeGreaterThan(1200);expect(box.y).toBeGreaterThan(800);
  await launcher.focus();await page.keyboard.press('Enter');
  const menu=page.getByRole('navigation',{name:'Workspace menu',exact:true});
  await expect(menu).toBeVisible();await expect(menu.getByRole('button')).toHaveCount(6);
  await menu.evaluate(async node => { await Promise.allSettled(node.getAnimations({subtree:true}).map(animation => animation.finished)); });
  await expect(menu).toHaveCSS('opacity','1');
  await page.screenshot({path:testInfo.outputPath('desktop-collapsed-menu-open.png')});
  await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(launcher).toBeFocused();
  await launcher.click();await menu.getByRole('button',{name:'Workspace Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your workspace. Your way.',exact:true})).toBeVisible();
  await expect(menu).toBeHidden();
  await expect(nav.getByRole('button',{name:'Workspace Settings',exact:true})).toBeFocused();
  await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeHidden();
});
for(const size of [{width:390,height:844},{width:320,height:568}]) test(`mobile bottom navigation remains static and reserves content at ${size.width}px`,async({page},testInfo)=>{
  await page.setViewportSize(size);await page.goto('/preview');
  const nav=page.getByRole('navigation',{name:'Workspace',exact:true});
  await expect(nav.getByRole('button')).toHaveCount(6);
  const before=(await nav.boundingBox())!;expect(before.y+before.height).toBeLessThanOrEqual(size.height+1);expect(before.y).toBeGreaterThan(size.height-120);
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.screenshot({path:testInfo.outputPath(`mobile-navigation-${size.width}px.png`)});
  const after=(await nav.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeHidden();
  await nav.getByRole('button',{name:'Workspace Settings',exact:true}).click();
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const lastLink=page.locator('.orbit-footer').getByRole('link',{name:'Terms',exact:true});await lastLink.scrollIntoViewIfNeeded();
  const last=(await lastLink.boundingBox())!,bottom=(await nav.boundingBox())!;
  expect(last.y+last.height).toBeLessThanOrEqual(bottom.y);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("every page retains the animated Orbit mark and reduced-motion override",async({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.goto("/preview");const mark=page.locator('.workspace-brand [data-orbit-mark="connecting"] canvas');
 const frame=()=>mark.evaluate(node=>{
   const canvas=node as HTMLCanvasElement;
   const pixels=canvas.getContext("2d")!.getImageData(0,0,canvas.width,canvas.height).data;
   let hash=2166136261,painted=false;
   for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i]>0)painted=true;}
   return {hash:hash>>>0,painted};
 });
 await expect.poll(async()=>(await frame()).painted).toBe(true);
 const moving=await frame();await expect.poll(async()=>(await frame()).hash).not.toBe(moving.hash);
 await page.getByRole("button",{name:"Workspace Settings",exact:true}).click();
 await page.getByRole("checkbox",{name:"Reduce decorative animation"}).check();
 await expect(page.locator("html")).toHaveAttribute("data-motion","paused");
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const paused=await frame();await page.waitForTimeout(200);expect(await frame()).toEqual(paused);
 await page.getByRole("button",{name:"Open profile",exact:true}).click();
 await expect(mark).toBeVisible();
 await expect.poll(async()=>(await frame()).painted).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const profile=await frame();await page.waitForTimeout(200);expect(await frame()).toEqual(profile);
});
