import { expect, test } from "@playwright/test";
test("commercial sign-in is explicit and responsive", async ({ page }) => {
 await page.goto("/");
 await expect(page.getByRole("heading", { name: "Welcome to Orbit." })).toBeVisible();
 await expect(page.getByText("Internal alpha access")).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
