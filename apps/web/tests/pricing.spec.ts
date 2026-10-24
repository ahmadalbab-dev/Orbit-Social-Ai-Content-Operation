import {expect,test} from '@playwright/test';
for(const width of [320,390,1440])test(`pricing navigation, plan details and themes work at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/preview');const plans=page.getByRole('navigation',{name:'Workspace',exact:true}).getByRole('link',{name:'Pricing / Plans',exact:true});
 await plans.scrollIntoViewIfNeeded();await plans.click();await expect(page).toHaveURL(/\/preview\/pricing$/);
 await expect(page.getByRole('heading',{name:/Small price.*Room to create/})).toBeVisible();
 await expect(page.getByRole('region',{name:'Subscription plans'}).getByRole('article')).toHaveCount(3);
 for(const name of ['Essential','Professional']){
  const trigger=page.getByRole('button',{name:`View ${name}`,exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name,exact:true});await expect(dialog).toBeVisible();await expect(dialog).toContainText('does not charge you or change your account');
  await page.keyboard.press('Tab');expect(await dialog.evaluate(node=>node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 }
 for(const mode of ['Light','Dark']){
  await page.getByRole('button',{name:`${mode} mode`,exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme',mode.toLowerCase());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.pricing-card').first()).toHaveCSS('transition-duration','0s');
  const contrast=await page.getByRole('button',{name:'View Professional',exact:true}).evaluate(node=>{const s=getComputedStyle(node),lum=(c:string)=>{const v=c.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;},a=lum(s.color),b=lum(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({path:testInfo.outputPath(`pricing-${width}-${mode}.png`),fullPage:true});
 }
 const comparison=page.getByRole('region',{name:/Plan feature comparison/});await expect(comparison.getByRole('columnheader')).toHaveCount(4);
 const question=page.locator('summary').filter({hasText:'Can Free generate both an image and a video?'});await question.click();await expect(page.getByText(/The proposed Free trial is one image OR/)).toBeVisible();
 await page.getByRole('link',{name:'Explore Free',exact:true}).click();await expect(page).toHaveURL(/\/preview\?view=studio$/);await expect(page.getByRole('heading',{name:'Create once. Review every channel.'})).toBeVisible();expect(posts).toEqual([]);
});
test('public pricing has public links and the collapsed desktop menu opens a separate pricing page',async({page})=>{
 await page.goto('/pricing');await expect(page.getByRole('link',{name:'Explore Free',exact:true})).toHaveAttribute('href','/?view=studio');
 await page.setViewportSize({width:1440,height:900});await page.goto('/preview');await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Workspace menu',exact:true}).getByRole('link',{name:'Pricing / Plans',exact:true}).click();await expect(page).toHaveURL(/\/preview\/pricing$/);
 await page.getByRole('button',{name:'View Essential',exact:true}).click();await page.getByRole('button',{name:'Close plan details',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
