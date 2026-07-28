import { expect, test } from "@playwright/test";
test("content studio renders", async ({ page }) => { await page.goto("/"); await expect(page.getByRole("heading", { name: "Create once. Publish everywhere." })).toBeVisible(); });
