import { expect, test } from '@playwright/test';

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
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill('editor@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orbit home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Video Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Image Editor', exact: true }).click();
  const asset = async (color: string) => Buffer.from(await page.evaluate(color => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color), 'base64');
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'base.png', mimeType: 'image/png', buffer: await asset('#ff0000') });
  await page.getByLabel('Add image overlay', { exact: true }).setInputFiles({ name: 'layer.png', mimeType: 'image/png', buffer: await asset('#0000ff') });
  const horizontal = page.getByLabel('Horizontal position', { exact: true });
  await expect(horizontal).toHaveValue('50');
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
  await page.getByRole('button', { name: 'Undo last composition', exact: true }).click();
  await expect(horizontal).toHaveValue('50');
  await expect(page.getByLabel('Layer opacity', { exact: true })).toHaveValue('100');
  await expect.poll(pixel).toEqual([0, 0, 255, 255]);
});
