import {expect,test} from "@playwright/test";
for(const width of [390,1440])test(`social setup opens centered with focus recovery at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width<700?844:900});await page.goto("/preview");
 await page.getByRole("button",{name:"Connections",exact:true}).click();
 for(const [id,name,fragment] of [["facebook","Facebook","pages-api"],["instagram","Instagram","instagram-platform"],["threads","Threads","threads"]]){
  await page.getByRole("button",{name:`Connect ${id}`,exact:true}).click();
  const dialog=page.getByRole("dialog",{name:`Connect ${name}`,exact:true});await expect(dialog).toBeVisible();
  const box=(await dialog.boundingBox())!,viewport=page.viewportSize()!;
  expect(Math.abs(box.x+box.width/2-viewport.width/2)).toBeLessThanOrEqual(2);
  expect(Math.abs(box.y+box.height/2-viewport.height/2)).toBeLessThanOrEqual(2);
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);

  await expect(dialog).toContainText("No social account will be authorised here");
  await expect(dialog.getByRole("link",{name:`Official ${name} setup`})).toHaveAttribute("href",new RegExp(`^https://developers\\.facebook\\.com/docs/${fragment}/`));
  await dialog.getByRole("button",{name:"Refresh connection status",exact:true}).click();await expect(dialog.getByRole("status")).toContainText("Sign in to check");
  await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button",{name:`Connect ${id}`,exact:true})).toBeFocused();
 }
});

async function signedWorkspace(page:import('@playwright/test').Page,connected=false) {
 const publishing={implemented:false,canPublishText:false,canPublishImage:false,canPublishVideo:false,reason:'Posting directly from Orbit is not available yet.'};
 await page.route('**/api/auth/session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'synthetic-connection-access',expires_in:3600,refreshable:true})}));
 await page.route('**/api/workspace/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const body=path.endsWith('/workspaces')?[{id:'fixture-workspace',name:'My Office',role:'OWNER'}]:path.endsWith('/integrations/status')?{livePublishing:false,providers:{threads:{configured:true,oauthImplemented:true,connected,publishing,accounts:connected?[{name:'Fixture Threads',accountType:'Profile',publishing:{...publishing,missingScopes:['threads_content_publish'],reason:'Account access is connected, but publishing permission has not been granted. Posting directly from Orbit is not available yet.'}}]:[]}}}:[];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
}

test('workspace owner can open official provider consent through the authenticated start operation',async({page})=>{
 await signedWorkspace(page);
 const authorizationUrl='https://threads.com/oauth/authorize?client_id=fixture&state=opaque';
 await page.route('**/api/workspace/integrations/oauth/threads/start',async route=>{
  expect(route.request().method()).toBe('POST');expect(route.request().postDataJSON()).toEqual({});
  expect(route.request().headers()['authorization']).toBe('Bearer synthetic-connection-access');
  expect(route.request().headers()['x-workspace-id']).toBe('fixture-workspace');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authorizationUrl,expiresAt:new Date(Date.now()+600000).toISOString()})});
 });
 await page.route('https://threads.com/oauth/authorize?*',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Official consent navigation fixture</h1>'}));
 await page.goto('/?view=connections');
 // Workspace bootstrap may replace the initial shell. Wait for its authenticated
 // status before interacting, rather than clicking a shell that is being replaced.
 await expect(page.locator('.connection-card.threads')).toContainText('Ready to connect');
 await page.getByRole('button',{name:'Connect threads',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Connect Threads',exact:true});
 await expect(dialog.getByText('Ready for your authorisation',{exact:true})).toBeVisible();
 await Promise.all([page.waitForURL(authorizationUrl),dialog.getByRole('button',{name:'Continue with Threads',exact:true}).click()]);
 await expect(page.getByRole('heading',{name:'Official consent navigation fixture'})).toBeVisible();
});

test('OAuth return opens centered Channels and verifies the account against workspace data',async({page})=>{
 await page.setViewportSize({width:390,height:844});await signedWorkspace(page,true);
 await page.goto('/?oauth=connected&provider=threads');
 const dialog=page.getByRole('dialog',{name:'Manage Threads',exact:true});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('status')).toContainText('Threads is connected to this workspace');
 await expect(dialog.getByRole('button',{name:'Reconnect Threads',exact:true})).toBeVisible();
 await expect(dialog.getByRole('region',{name:'Publishing capability'})).toContainText('publishing permission has not been granted');
 await expect(page.locator('.connection-card.threads')).toContainText('Connected');
 await expect(page).not.toHaveURL(/[?&](oauth|provider)=/);
 const box=(await dialog.boundingBox())!;expect(Math.abs(box.y+box.height/2-422)).toBeLessThanOrEqual(2);
});

test('unconfirmed OAuth result never fabricates a connected account',async({page})=>{
 await signedWorkspace(page,false);await page.goto('/?oauth=connected&provider=threads');
 const dialog=page.getByRole('dialog',{name:'Connect Threads',exact:true});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('status')).toContainText('has not confirmed the account yet');
 await expect(dialog.getByRole('button',{name:'Continue with Threads',exact:true})).toBeVisible();
});
