import { expect, test } from "@playwright/test";

test("light default keeps the auth form compact while widening only the hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const form = await page
    .getByRole("form", { name: "Sign in to Orbit" })
    .boundingBox();
  const hero = await page.locator(".auth-orbit-visual").boundingBox();
  expect(form?.width).toBeLessThanOrEqual(400);
  expect(hero!.width).toBeGreaterThan(900);
  const artwork = page.locator(".auth-orbit-visual canvas");
  await expect(artwork).toHaveAttribute("data-scene", "orbit");
  await expect(artwork).toHaveAttribute("data-scene", "ai-studio", { timeout: 12000 });
  await expect(page.locator(".orbit-ai-signature")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("desktop dock expands on hover and supports keyboard dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/preview");
  const dock = page.locator(".navigation-dock"),
    launcher = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
  await expect(dock).toHaveAttribute("data-expanded", "false");
  await launcher.hover();
  await expect(dock).toHaveAttribute("data-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Content Studio", exact: true }),
  ).toBeVisible();
  await page.mouse.move(15, 15);
  await expect(dock).toHaveAttribute("data-expanded", "false");
  await launcher.focus();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeVisible();
  await expect(launcher).toBeFocused();
});

test.describe("touch navigation", () => {
  test.use({ hasTouch: true, isMobile: true });
  test("touch sized dock opens by tap and returns to compact after selecting", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/preview");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .tap();
    await page
      .getByRole("button", { name: "Content Studio", exact: true })
      .tap();
    await expect(page.locator(".navigation-dock")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
