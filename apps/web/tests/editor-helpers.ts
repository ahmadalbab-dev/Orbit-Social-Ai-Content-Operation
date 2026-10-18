import type { Page } from '@playwright/test';
export async function selectEditorTool(page: Page, kind: 'Image' | 'Video', name: string) {
  await page.getByRole('navigation', { name: `${kind} editing tools`, exact: true }).getByRole('button', { name, exact: true }).click();
}

/** Use the same desktop collapsed-menu flow available to a scrolled user. */
export async function selectWorkspaceDestination(page: Page, name: string) {
  const headerDestination = page.getByRole('navigation', { name: 'Workspace', exact: true }).getByRole('button', { name, exact: true });
  if (await headerDestination.isVisible()) {
    await headerDestination.click();
    return;
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('navigation', { name: 'Workspace menu', exact: true }).getByRole('button', { name, exact: true }).click();
}
