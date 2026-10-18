import { expect, type Page } from '@playwright/test';
export async function selectEditorTool(page: Page, kind: 'Image' | 'Video', name: string) {
  await page.getByRole('navigation', { name: `${kind} editing tools`, exact: true }).getByRole('button', { name, exact: true }).click();
}

/** Session tests return to the stable header; collapse behavior is covered separately. */
export async function selectWorkspaceDestination(page: Page, name: string) {
  const navigation = page.getByRole('navigation', { name: 'Workspace', exact: true });
  await expect(page.locator('.workspace-nav-slot')).toBeAttached();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.workspace-nav-slot')).toHaveAttribute('data-floating', 'false');
  const destination = navigation.getByRole('button', { name, exact: true });
  await expect(destination).toBeVisible();
  await expect(destination).toBeInViewport();
  await destination.click();
}
