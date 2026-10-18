import type { Page } from '@playwright/test';
export async function selectEditorTool(page: Page, kind: 'Image' | 'Video', name: string) {
  await page.getByRole('navigation', { name: `${kind} editing tools`, exact: true }).getByRole('button', { name, exact: true }).click();
}
