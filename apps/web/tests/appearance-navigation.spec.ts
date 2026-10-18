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

for (const size of [{width:1440,height:1000},{width:390,height:844}]) {
  test(`complete navigation moves from header to floating after scroll at ${size.width}px`, async ({page})=>{
    await page.setViewportSize(size);await page.goto("/preview");
    const row=page.locator(".workspace-navigation"),nav=page.getByRole("navigation",{name:"Workspace",exact:true});
    await expect(row).toHaveAttribute("data-floating","false");
    await expect(nav.getByRole("button")).toHaveCount(6);
    for(const name of ["Home","Studio","Media","Calendar","Channels","Settings"])await expect(nav.locator(".reference-dock-label",{hasText:name})).toBeVisible();
    await expect(page.getByRole("button",{name:"Open navigation",exact:true})).toHaveCount(0);
    await expect(page.locator(".current-workspace-name")).toHaveText("Preview workspace");
    const staticBox=await nav.boundingBox();
    await page.evaluate(()=>window.scrollTo(0,450));
    await expect(row).toHaveAttribute("data-floating","true");
    const floatingBox=await nav.boundingBox();expect(floatingBox!.y).toBeLessThan(30);expect(floatingBox!.height).toBeLessThan(staticBox!.height);
    for(const button of await nav.getByRole("button").all())await expect(button).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await nav.getByRole("button",{name:"Workspace Settings",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Your workspace. Your way.",exact:true})).toBeVisible();
    await expect(row).toHaveAttribute("data-floating","false");
    await nav.getByRole("button",{name:"Video Editor",exact:true}).click();
    await expect(nav.getByRole("button",{name:"Video Editor",exact:true})).toHaveAttribute("aria-current","page");
  });
}
test("every page retains the animated Orbit mark and reduced-motion override",async({page})=>{
 await page.goto("/preview");const ellipse=page.locator(".workspace-brand .orbit-mark ellipse");
 await expect(ellipse).toHaveCSS("animation-name","orbit-logo-ring");
 await page.getByRole("button",{name:"Workspace Settings",exact:true}).click();
 await page.getByRole("checkbox",{name:"Reduce decorative animation"}).check();
 await expect(ellipse).toHaveCSS("animation-name","none");
 await page.getByRole("button",{name:"Open profile",exact:true}).click();
 await expect(ellipse).toBeVisible();await expect(ellipse).toHaveCSS("animation-name","none");
});
