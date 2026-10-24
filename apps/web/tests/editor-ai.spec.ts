import { selectEditorTool } from './editor-helpers';
import { expect, test } from '@playwright/test';

test('Cloudflare image edit shares a bounded preview only on click and loads returned pixels', async ({ page }) => {
  let submitted: {imageDataUrl:string;prompt:string}|undefined;
  let output: Buffer;
  await page.route('**/api/auth/session', r => r.fulfill({json:{access_token:'fixture-editor-token',expires_in:3600,refreshable:true}}));
  await page.route('https://auth.orbit.test/auth/v1/user', r => r.fulfill({json:{email_confirmed_at:'2026-10-17T00:00:00Z'}}));
  await page.route('**/api/workspace/**', r => {
    const path = new URL(r.request().url()).pathname;
    if(path.endsWith('/media/image-edit')){
      submitted=r.request().postDataJSON();
      return r.fulfill({status:200,contentType:'image/png',body:output});
    }
    const body=path.endsWith('/workspaces')?[{id:'fixture-workspace',name:'Editor test',role:'OWNER'}]
      :path.endsWith('/media/image-edit/status')?{configured:true,provider:'cloudflare',verified:false}
      :path.endsWith('/media/status')?{configured:false,limits:{uploadBytes:25000000,maxDuration:120}}
      :path.endsWith('/integrations/status')?{providers:{}}
      :path.endsWith('/ai/status')?{configured:true}:[];
    return r.fulfill({json:body});
  });
  await page.goto('/editor/image');
  const asset=async(color:string)=>Buffer.from(await page.evaluate(color=>{
    const c=document.createElement('canvas');c.width=1600;c.height=1000;
    const x=c.getContext('2d')!;x.fillStyle=color;x.fillRect(0,0,c.width,c.height);
    return c.toDataURL().split(',')[1];
  },color),'base64');
  output=await asset('#0000ff');
  await page.getByLabel('Choose image',{exact:true}).setInputFiles({name:'source.png',mimeType:'image/png',buffer:await asset('#ff0000')});
  await selectEditorTool(page,'Image','AI editor');
  await page.getByText('Generate a new background or visual with AI',{exact:true}).click();
  await expect(page.getByText(/this preview and your instruction to Cloudflare Workers AI/)).toBeVisible();
  await page.getByLabel('AI image edit instruction',{exact:true}).fill('Replace the background with blue');
  expect(submitted).toBeUndefined();
  await page.getByRole('button',{name:'Edit image with AI',exact:true}).click();
  await expect(page.getByText('AI edit loaded. Review it before exporting. Your original file is unchanged.',{exact:true})).toBeVisible();
  expect(submitted?.prompt).toBe('Replace the background with blue');
  const dimensions=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return [i.width,i.height];},submitted!.imageDataUrl);
  expect(Math.max(...dimensions)).toBe(511);
  await expect.poll(()=>page.getByLabel('Edited image preview',{exact:true}).evaluate(n=>Array.from((n as HTMLCanvasElement).getContext('2d')!.getImageData(50,50,1,1).data))).toEqual([0,0,255,255]);
});

test('AI proposes layer changes, applies them together and restores the composition with Undo', async ({ page }) => {
  let submitted: { kind: string; current: { layers: { index: number; x: number }[] } } | undefined;
  await page.route('https://auth.orbit.test/auth/v1/token?grant_type=password', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fixture-editor-token', expires_in: 3600 }),
  }));
  await page.route('https://auth.orbit.test/auth/v1/user', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ email_confirmed_at: '2026-10-17T00:00:00Z' }),
  }));
  await page.route('**/api/workspace/**', route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith('/workspaces')) body = [{ id: 'fixture-workspace', name: 'Editor test', role: 'OWNER' }];
    else if (path.endsWith('/integrations/status')) body = { providers: {} };
    else if (path.endsWith('/ai/status')) body = { configured: true };
    else if (path.endsWith('/media/status')) body = { configured: false, limits: { uploadBytes: 25000000, maxDuration: 120 } };
    else if (path.endsWith('/media/image-edit/status')) body = { configured: false };
    else if (path.endsWith('/billing/status')) return route.fulfill({ status: 503, body: '{}' });
    else if (path.endsWith('/media/editor-plan')) {
      submitted = route.request().postDataJSON();
      body = { summary: 'Move the uploaded layer to the upper right.', changes: { layers: [{ index: 0, x: 80, y: 20, width: 20, opacity: 50 }] } };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/auth/session', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({access_token:'fixture-editor-token',expires_in:3600,refreshable:true}) }));
  await page.goto('/editor/image');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  const asset = async (color: string) => Buffer.from(await page.evaluate(color => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color), 'base64');
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'base.png', mimeType: 'image/png', buffer: await asset('#ff0000') });
  await selectEditorTool(page, 'Image', 'Layers');
  await page.getByLabel('Add image overlay', { exact: true }).setInputFiles({ name: 'layer.png', mimeType: 'image/png', buffer: await asset('#0000ff') });
  const horizontal = page.getByLabel('Horizontal position', { exact: true });
  await expect(horizontal).toHaveValue('50');
  await selectEditorTool(page, 'Image', 'AI editor');
  await page.getByLabel('AI image editing instruction', { exact: true }).fill('Move my layer to the upper right, make it smaller and half transparent.');
  await page.getByRole('button', { name: 'Prepare AI edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply AI edit', exact: true })).toBeVisible();
  expect(submitted?.kind).toBe('image');
  expect(submitted?.current.layers[0]).toMatchObject({ index: 0, x: 50 });
  await expect(horizontal).toHaveValue('50');
  await page.getByRole('button', { name: 'Apply AI edit', exact: true }).click();
  await expect(horizontal).toHaveValue('80');
  await expect(page.getByLabel('Vertical position', { exact: true })).toHaveValue('20');
  await expect(page.getByLabel('Layer size', { exact: true })).toHaveValue('20');
  await expect(page.getByLabel('Layer opacity', { exact: true })).toHaveValue('50');
  const pixel = () => page.getByLabel('Edited image preview', { exact: true }).evaluate(node => Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(50, 50, 1, 1).data));
  await expect.poll(pixel).toEqual([255, 0, 0, 255]);
  await selectEditorTool(page, 'Image', 'Export');
  await page.getByRole('button', { name: 'Undo last composition', exact: true }).click();
  await expect(horizontal).toHaveValue('50');
  await expect(page.getByLabel('Layer opacity', { exact: true })).toHaveValue('100');
  await expect.poll(pixel).toEqual([0, 0, 255, 255]);
});


test('replacing same-aspect media rejects a pending preview-guided AI proposal without uploading local asset identities', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let dispatched!: () => void;
  const started = new Promise<void>(resolve => { dispatched = resolve; });
  await page.route('**/api/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fixture-editor-token', expires_in: 3600, refreshable: true }) }));
  await page.route('https://auth.orbit.test/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email_confirmed_at: '2026-10-17T00:00:00Z' }) }));
  await page.route('**/api/workspace/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/media/editor-plan')) {
      submitted = route.request().postDataJSON(); dispatched(); await held;
      // Replacing the media may already have aborted the browser request.
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: 'A proposal for the original red image.', changes: { caption: 'OLD IMAGE PROPOSAL' } }) }).catch(() => {});
      return;
    }
    const body = path.endsWith('/workspaces') ? [{ id: 'fixture-workspace', name: 'Editor test', role: 'OWNER' }]
      : path.endsWith('/integrations/status') ? { providers: {} }
      : path.endsWith('/media/status') ? { configured: false, limits: { uploadBytes: 25000000, maxDuration: 120 } }
      : path.endsWith('/ai/status') ? { configured: true }
      : path.endsWith('/media/image-edit/status') ? { configured: false } : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/editor/image');
  const asset = async (color: string) => Buffer.from(await page.evaluate(color => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL().split(',')[1];
  }, color), 'base64');
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'original.png', mimeType: 'image/png', buffer: await asset('#ff0000') });
  await selectEditorTool(page, 'Image', 'AI editor');
  await page.getByLabel('AI image editing instruction', { exact: true }).fill('Add a caption suitable for this photo.');
  await page.getByLabel('Use current preview with AI').check();
  await page.getByRole('button', { name: 'Prepare AI edit', exact: true }).click();
  await started;
  try {
    expect(Object.keys(submitted!).sort()).toEqual(['current', 'instruction', 'kind', 'previewDataUrl']);
    expect(submitted!.previewDataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(JSON.stringify(submitted!.current)).not.toMatch(/blob:|assetIdentity|original\.png/);
    await selectEditorTool(page, 'Image', 'Media');
    await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: await asset('#0000ff') });
    await expect.poll(() => page.getByLabel('Edited image preview', { exact: true }).evaluate(node => Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(50, 50, 1, 1).data))).toEqual([0, 0, 255, 255]);
  } finally { release(); }
  await selectEditorTool(page, 'Image', 'AI editor');
  await expect(page.getByRole('button', { name: 'Prepare AI edit', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Apply AI edit', exact: true })).toHaveCount(0);
  await expect(page.getByText('A proposal for the original red image.', { exact: true })).toHaveCount(0);
  await selectEditorTool(page, 'Image', 'Adjust & text');
  await expect(page.getByLabel('Image caption', { exact: true })).toHaveValue('');
});

test('Cloudflare creates from text without an upload, restores with Undo and preserves the editor on quota failure',async({page})=>{
 const prompts:unknown[]=[];let refuse=false;let output:Buffer;
 await page.route('**/api/auth/session',route=>route.fulfill({json:{access_token:'fixture-editor-token',expires_in:3600,refreshable:true}}));
 await page.route('https://auth.orbit.test/auth/v1/user',route=>route.fulfill({json:{email_confirmed_at:'2026-10-17T00:00:00Z'}}));
 await page.route('**/api/workspace/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/media/image-edit/generate')){
   prompts.push(route.request().postDataJSON());
   return refuse?route.fulfill({status:429,json:{message:'AI provider quota reached. Try again after it resets.'}}):route.fulfill({status:200,contentType:'image/png',body:output});
  }
  const body=path.endsWith('/workspaces')?[{id:'fixture-workspace',name:'Editor test',role:'OWNER'}]
   :path.endsWith('/media/image-edit/status')?{configured:true,provider:'cloudflare',canGenerate:true,verified:false}
   :path.endsWith('/media/status')?{configured:false,limits:{uploadBytes:25000000,maxDuration:120}}
   :path.endsWith('/integrations/status')?{providers:{}}:[];
  return route.fulfill({json:body});
 });
 await page.goto('/editor/image');
 output=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;x.fillStyle='#00ff00';x.fillRect(0,0,128,128);return c.toDataURL().split(',')[1];}),'base64');
 await selectEditorTool(page,'Image','AI editor');
 await page.getByText('Generate a new background or visual with AI',{exact:true}).click();
 await page.getByRole('button',{name:'Create from text',exact:true}).click();
 const prompt=page.getByRole('textbox',{name:'AI image generation prompt',exact:true});
 await expect(prompt).toHaveAttribute('maxlength','1500');
 await prompt.fill('A green ceramic cup on a cream background');
 await expect(page.getByText(/no current image or original file is uploaded/)).toBeVisible();
 expect(prompts).toEqual([]);
 await page.getByRole('button',{name:'Generate image with AI',exact:true}).click();
 await expect(page.getByText('AI image generated. Review and edit it before exporting. Undo restores your previous composition.',{exact:true})).toBeVisible();
 expect(prompts).toEqual([{prompt:'A green ceramic cup on a cream background'}]);
 const canvas=page.getByLabel('Edited image preview',{exact:true});
 await expect(canvas).toBeVisible();
 // Browser colour management may round a decoded RGB channel by one unit.
 await expect.poll(()=>canvas.evaluate(n=>{const pixel=Array.from((n as HTMLCanvasElement).getContext('2d')!.getImageData(50,50,1,1).data);return Math.max(...pixel.map((value,index)=>Math.abs(value-[0,255,0,255][index])));})).toBeLessThanOrEqual(1);
 await selectEditorTool(page,'Image','Export');
 await page.getByRole('button',{name:'Undo last composition',exact:true}).click();
 await expect(canvas).toBeHidden();
 await selectEditorTool(page,'Image','AI editor');
 refuse=true;
 await page.getByRole('button',{name:'Generate image with AI',exact:true}).click();
 await expect(page.getByText('AI provider quota reached. Try again after it resets.',{exact:true})).toBeVisible();
 await expect(canvas).toBeHidden();
 expect(prompts).toHaveLength(2);
});
