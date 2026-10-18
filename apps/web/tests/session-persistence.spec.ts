import {selectWorkspaceDestination} from './editor-helpers';
import {expect,test} from "@playwright/test";
test("reload restores the selected workspace from HttpOnly refresh cookie and signout removes persistence",async({page,context})=>{
 const sessionActions:string[]=[];let rotation=0;
 await page.route('**/api/auth/session',async route=>{
  const request=route.request();
  if(request.method()==='DELETE'){
   sessionActions.push('delete');await route.fulfill({status:200,contentType:'application/json',headers:{'Set-Cookie':'orbit-refresh=; Path=/api/auth/session; HttpOnly; SameSite=Strict; Max-Age=0'},body:JSON.stringify({signedOut:true})});return;
  }
  const body=request.postDataJSON() as {action:string;refreshToken?:string};sessionActions.push(body.action);
  const cookies=await context.cookies('http://localhost:3000/api/auth/session');
  const stored=cookies.find(cookie=>cookie.name==='orbit-refresh');
  if(body.action!=='establish'&&!stored){await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'No saved session.'})});return;}
  if(body.action==='establish')expect(body.refreshToken).toBe('synthetic-initial-refresh');
  else expect(body).toEqual({action:'restore'});
  rotation++;
  await route.fulfill({status:200,contentType:'application/json',headers:{'Set-Cookie':`orbit-refresh=synthetic-refresh-${rotation}; Path=/api/auth/session; HttpOnly; SameSite=Strict; Max-Age=2592000`},body:JSON.stringify({access_token:`synthetic-access-${rotation}`,expires_in:3600,refreshable:true})});
 });
 await page.route('https://auth.orbit.test/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'synthetic-password-access',refresh_token:'synthetic-initial-refresh',expires_in:3600})}));
 await page.route('https://auth.orbit.test/auth/v1/logout*',route=>route.fulfill({status:204}));
 await page.route('**/api/workspace/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const body=path.endsWith('/workspaces')?[{id:'work-main',name:'My Office',role:'OWNER'},{id:'work-qa',name:'Orbit Verification',role:'OWNER'}]:path.endsWith('/integrations/status')?{providers:{}}:path.endsWith('/ai/status')?{configured:false}:[];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await expect(page.getByRole('form',{name:'Sign in to Orbit'})).toBeVisible();
 await page.getByLabel('Email address',{exact:true}).fill('tester@example.test');await page.getByLabel('Password',{exact:true}).fill('synthetic-password-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.locator('.current-workspace-name')).toHaveText('My Office');
 await expect(page.getByRole('region',{name:'Workspace session',exact:true})).toBeHidden();
 await selectWorkspaceDestination(page,'Workspace Settings');
 await page.getByRole('region',{name:'Workspace session',exact:true}).getByLabel('Workspace',{exact:true}).selectOption('work-qa');
 await expect(page.locator('.current-workspace-name')).toHaveText('Orbit Verification');
 await expect(page.getByRole('region',{name:'Workspace session',exact:true})).toBeHidden();
 const refreshCookie=(await context.cookies('http://localhost:3000/api/auth/session')).find(cookie=>cookie.name==='orbit-refresh');expect(refreshCookie?.httpOnly).toBe(true);expect(refreshCookie?.sameSite).toBe('Strict');
 expect(await page.evaluate(()=>document.cookie)).not.toContain('synthetic-refresh');
 await page.reload();await expect(page.locator('.current-workspace-name')).toHaveText('Orbit Verification');
 expect(rotation).toBeGreaterThanOrEqual(2);expect(sessionActions).toContain('establish');
 const storage=await page.evaluate(()=>({local:Object.values(localStorage),session:Object.values(sessionStorage)}));
 expect(JSON.stringify(storage)).not.toMatch(/synthetic-(access|refresh|password)|synthetic-initial-refresh/);
 await page.goto('/editor/image');
 await expect(page.locator('.editor-workspace')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Workspace',exact:true})).toHaveCount(0);
 await expect(page.getByRole('form',{name:'Sign in to Orbit'})).toHaveCount(0);
 await page.reload();await expect(page.locator('.editor-workspace')).toBeVisible();
 await page.getByRole('link',{name:'Back to media',exact:true}).click();
 await expect(page).toHaveURL(/\/\?view=video$/);
 await expect(page.locator('.current-workspace-name')).toHaveText('Orbit Verification');
 await expect(page.getByRole('link',{name:'Start image editing',exact:true})).toBeVisible();
 await selectWorkspaceDestination(page,'Workspace Settings');await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('form',{name:'Sign in to Orbit'})).toBeVisible();
 await expect.poll(async()=>(await context.cookies('http://localhost:3000/api/auth/session')).some(cookie=>cookie.name==='orbit-refresh')).toBe(false);
 await page.reload();await expect(page.getByRole('form',{name:'Sign in to Orbit'})).toBeVisible();await expect(page.locator('.current-workspace-name')).toHaveCount(0);expect(sessionActions).toContain('delete');
});
