import { expect, test, type Page } from "@playwright/test";

async function navigate(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Workspace", exact: true }).getByRole("button", { name, exact: true }).click();
}

test("phone preview navigates without backend calls or fake access", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const remoteCalls: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/v1/")) remoteCalls.push(request.url()); });
  await page.goto("/preview");
  await expect(page.getByText("v1 design preview · local tools only")).toBeVisible();
  await navigate(page, "Content Studio");
  await expect(page.getByRole("button", { name: "Generate AI content" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start manually" })).toBeDisabled();
  await navigate(page, "Video Editor");
  await expect(page.getByText("Edit and export on your device. Sign in for workspace uploads.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh renders" })).toBeDisabled();
  await navigate(page, "Calendar");
  await expect(page.getByRole("heading", { name: "Make space for your next post." })).toBeVisible();
  await navigate(page, "Connections");
  await page.getByRole("button", {name:"Connect facebook",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("This is a design preview");
  await page.getByRole("button",{name:"Close connection setup",exact:true}).click();
  await page.getByRole("button", {name:"Open profile",exact:true}).click();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeDisabled();
  await navigate(page, "Workspace Settings");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(remoteCalls).toEqual([]);
});

test("local image edits export from preview without sign-in or upload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const uploaded: string[] = [];
  page.on("request", request => { if (request.method() === "POST") uploaded.push(request.url()); });
  await page.goto("/preview");
  await navigate(page, "Video Editor");
  await page.getByRole("button", { name: "Image Editor", exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext("2d")!; context.fillStyle = "#9679ed"; context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Choose image", { exact: true }).setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByText("Adjust image and text", {exact:true}).click();
  await expect(page.getByRole("button", { name: "Rotate image" })).toBeEnabled();
  await page.getByRole("button", { name: "Rotate image" }).click();
  await page.getByLabel("Image crop", { exact: true }).selectOption("1:1");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("orbit-slide-01.png");
  expect(uploaded).toEqual([]);
});
