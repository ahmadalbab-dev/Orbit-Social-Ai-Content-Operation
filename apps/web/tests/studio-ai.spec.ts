import {expect,test} from '@playwright/test';

test('Studio stages the active draft for AI rewrite without sending it until Generate',async({page})=>{
 const original='Public fixture caption for a handmade coffee cup.';
 const draft={id:'draft-one',topic:'Public fixture',status:'DRAFT',revision:1,variants:[{platform:'facebook',copy:original,hashtags:[],callToAction:''}]};
 const generations:unknown[]=[];let brands=0;let statusChecks=0;let writes=0;
 let statusAvailable=true;
 await page.route('**/api/auth/session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'synthetic-studio-access',expires_in:3600,refreshable:true})}));
 await page.route('**/api/workspace/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  let response:unknown=[];
  if(request.method()!=='GET')writes++;
  if(path.endsWith('/workspaces'))response=[{id:'workspace-one',name:'Test workspace',role:'OWNER'}];
  else if(path.endsWith('/integrations/status'))response={livePublishing:false,providers:{}};
  else if(path.endsWith('/ai/status')){
   statusChecks++;
   if(!statusAvailable){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Unavailable'})});return;}
   response={configured:true,provider:'gemini',model:'gemini-3.5-flash-lite',verified:false,privacy:{unpaidDataUse:true,unpaidDataUseAcknowledged:true,previewSharingAllowed:false}};
  }else if(path.endsWith('/content'))response=[draft];
  else if(path.endsWith('/brands')){if(request.method()==='POST'){brands++;response={id:'brand-one'};}}
  else if(path.endsWith('/content/generate')){
   generations.push(request.postDataJSON());response={...draft,id:'generated-one',variants:[{...draft.variants[0],copy:'AI rewritten public fixture'}]};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 await page.goto('/?view=studio');
 const connection=page.getByRole('region',{name:'Workspace AI connection'});
 await expect(connection).toContainText('gemini-3.5-flash-lite');
 await expect(connection).toContainText('Google may use your brief');
 await expect(connection).toContainText('Configuration check only');
 await expect(page.getByRole('button',{name:'Generate AI content'})).toBeEnabled();
 await page.getByRole('combobox',{name:'Open saved draft'}).selectOption('draft-one');
 await page.getByRole('button',{name:'Use this draft for AI rewrite'}).click();
 const brief=page.getByRole('textbox',{name:'Your idea or text'});
 await expect(brief).toHaveValue(original);await expect(brief).toBeFocused();
 await expect(page.getByRole('combobox',{name:'AI content task'})).toHaveValue('rewrite');
 await expect(page.getByRole('button',{name:'Select facebook',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Select instagram',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(page.getByRole('textbox',{name:'facebook copy',exact:true})).toHaveValue(original);
 expect(generations).toHaveLength(0);expect(brands).toBe(0);expect(writes).toBe(0);
 await expect(brief).toHaveAttribute('maxlength','4000');
 await brief.fill('x'.repeat(4001));await expect(brief).toHaveValue('x'.repeat(4000));
 await brief.fill('');await expect(page.getByRole('button',{name:'Generate AI content'})).toBeDisabled();
 await brief.fill(original);
 await page.getByRole('textbox',{name:'facebook copy',exact:true}).fill(original+' Keep my local changes.');
 await page.getByRole('button',{name:'Use this draft for AI rewrite'}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Generate AI content'}).click();
 await expect(brief).toHaveValue(original+' Keep my local changes.');
 await expect(page.getByRole('textbox',{name:'facebook copy',exact:true})).toHaveValue(original+' Keep my local changes.');
 expect(generations).toHaveLength(0);expect(brands).toBe(0);expect(writes).toBe(0);
 await page.getByRole('textbox',{name:'facebook copy',exact:true}).fill(original);
 await page.getByRole('button',{name:'Use this draft for AI rewrite'}).click();
 await page.getByRole('button',{name:'Check setup'}).click();
 await expect(page.getByRole('button',{name:'Generate AI content'})).toBeEnabled();
 expect(generations).toHaveLength(0);expect(writes).toBe(0);expect(statusChecks).toBeGreaterThanOrEqual(2);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Generate AI content'}).click();
 await expect(page.getByRole('textbox',{name:'facebook copy',exact:true})).toHaveValue('AI rewritten public fixture');
 expect(generations).toEqual([{brandId:'brand-one',topic:original,platforms:['facebook'],mode:'rewrite',language:'Bahasa Melayu'}]);
 expect(brands).toBe(1);expect(writes).toBe(2);
 statusAvailable=false;
 await page.getByRole('button',{name:'Check setup'}).click();
 await expect(connection).toContainText('AI status unavailable');
 await expect(connection).not.toContainText('gemini-3.5-flash-lite');
 await expect(page.getByRole('button',{name:'Generate AI content'})).toBeDisabled();
 expect(generations).toHaveLength(1);
});

test('design preview does not dispatch AI and keeps the brief bounded',async({page})=>{
 const writes:string[]=[];
 await page.route('**/api/workspace/**',route=>{writes.push(route.request().url());return route.abort();});
 await page.goto('/preview?view=studio');
 await expect(page.getByRole('button',{name:'Generate AI content'})).toBeDisabled();
 await expect(page.getByRole('textbox',{name:'Your idea or text'})).toHaveAttribute('maxlength','4000');
 expect(writes).toEqual([]);
});
