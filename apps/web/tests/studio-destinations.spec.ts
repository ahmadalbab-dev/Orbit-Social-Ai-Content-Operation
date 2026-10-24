import {expect,test} from '@playwright/test';

test('Studio saves destination accounts with a new draft revision and restores them after reload',async({page})=>{
 let draft={id:'draft-one',topic:'Public fixture',status:'APPROVED',revision:2,socialAccountIds:['page-main'],variants:[{platform:'facebook',copy:'A public test caption',hashtags:[],callToAction:''}]};
 const reviews:unknown[]=[];let publicationRequests=0;
 await page.route('**/api/auth/session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'synthetic-studio-access',expires_in:3600,refreshable:true})}));
 await page.route('**/api/workspace/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let response:unknown=[];
  if(path.endsWith('/workspaces'))response=[{id:'workspace-one',name:'Test workspace',role:'OWNER'}];
  else if(path.endsWith('/integrations/status'))response={livePublishing:false,providers:{facebook:{configured:true,connected:true,oauthImplemented:true,accounts:[{id:'page-main',name:'Orbit Page',accountType:'Page',connected:true},{id:'page-second',name:'Second Page',accountType:'Page',connected:true}]}}};
  else if(path.endsWith('/ai/status'))response={configured:false,verified:false};
  else if(path.endsWith('/content'))response=[draft];
  else if(path.endsWith('/content/draft-one/review')){
   expect(route.request().method()).toBe('PUT');
   const body=route.request().postDataJSON();reviews.push(body);
   expect(body.expectedRevision).toBe(draft.revision);
   draft={...draft,status:'DRAFT',revision:draft.revision+1,variants:body.variants,socialAccountIds:body.socialAccountIds};response=draft;
  }else if(path.endsWith('/publish'))publicationRequests++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 async function openDraft(){
  await page.goto('/?view=studio');
  await page.getByRole('combobox',{name:'Open saved draft'}).selectOption('draft-one');
  await expect(page.getByRole('group',{name:'Social account destinations'})).toContainText('Posting from Orbit remains off');
 }
 await openDraft();
 const main=page.getByRole('checkbox',{name:'Orbit Page (facebook)',exact:true});
 const second=page.getByRole('checkbox',{name:'Second Page (facebook)',exact:true});
 await expect(main).toBeChecked();await expect(second).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Simulate publishing'})).toBeEnabled();
 await second.check();
 await expect(page.getByRole('button',{name:'Simulate publishing'})).toBeDisabled();
 await page.getByRole('button',{name:'Save draft'}).click();
 await expect(page.locator('.review-panel').getByRole('status')).toContainText('Approval is required again');
 expect(draft).toMatchObject({status:'DRAFT',revision:3,socialAccountIds:['page-main','page-second']});
 await openDraft();await expect(main).toBeChecked();await expect(second).toBeChecked();
 await main.uncheck();await second.uncheck();
 await page.getByRole('button',{name:'Save draft'}).click();
 await expect(page.locator('.review-panel').getByRole('status')).toContainText('Approval is required again');
 await openDraft();await expect(main).not.toBeChecked();await expect(second).not.toBeChecked();
 expect(reviews).toHaveLength(2);expect(draft.socialAccountIds).toEqual([]);expect(publicationRequests).toBe(0);
});
