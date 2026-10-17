import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`account entry stays compact and navigable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to Orbit.' })).toBeVisible();
    const form = page.getByRole('form', { name: 'Sign in to Orbit' });
    await expect(form.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    const bounds = await form.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(400);
    const email = page.getByLabel('Email address', { exact: true });
    expect(await email.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await email.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await expect(page.getByText('Internal alpha access')).toHaveCount(0);
    await expect(page.locator('.auth-orbit-visual canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Make room for your ideas.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Find your way back.' })).toBeVisible();
  });
}

test('failed sign-in guides new users, retains email and clears password', async ({ page }) => {
  // Synthetic credentials never reach an identity service.
  await page.route('https://auth.orbit.test/auth/v1/token?grant_type=password', route => route.fulfill({
    status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', message: 'private provider text' }),
  }));
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill('tester@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Create an account first');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('tester@example.test');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByText('private provider text')).toHaveCount(0);
});

test('signup returns to sign-in and confirmation is verified without auto-login', async ({ page }) => {
  let redirect = '';
  await page.route('https://auth.orbit.test/auth/v1/signup*', route => {
    redirect = new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'fixture-pending' } }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill('tester@example.test');
  await page.getByLabel('Create a password', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Orbit.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('confirmation email');
  expect(redirect).toBe('http://localhost:3000/');
  await page.route('https://auth.orbit.test/auth/v1/user', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ email_confirmed_at: '2026-10-17T00:00:00Z' }),
  }));
  await page.route('https://auth.orbit.test/auth/v1/logout?scope=local', route => route.fulfill({ status: 204 }));
  await page.goto('/#type=signup&access_token=synthetic-email-link-token');
  await expect(page.getByRole('status')).toContainText('Email confirmed. Sign in');
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(page.getByRole('form', { name: 'Sign in to Orbit' })).toBeVisible();
  // A confirmed identity still explicitly signs in. The resulting verified session opens onboarding.
  await page.route('https://auth.orbit.test/auth/v1/token?grant_type=password', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fixture-workspace-token', expires_in: 3600 }),
  }));
  await page.route('**/api/workspace/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/workspaces') && route.request().method() === 'POST'
      ? { id: 'fixture-workspace', name: 'My workspace', role: 'OWNER' }
      : path.endsWith('/integrations/status') ? { providers: {} }
      : path.endsWith('/ai/status') ? { configured: false }
      : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.getByLabel('Email address', { exact: true }).fill('tester@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Sign in to Orbit' })).toHaveCount(0);
  await expect(page.getByText('Create your first workspace to start.', { exact: true })).toBeVisible();
  await page.getByLabel('Workspace name', { exact: true }).fill('My workspace');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orbit home', exact: true })).toBeVisible();
  await expect(page.locator('.navigation-dock')).toHaveAttribute('data-expanded', 'false');
});
