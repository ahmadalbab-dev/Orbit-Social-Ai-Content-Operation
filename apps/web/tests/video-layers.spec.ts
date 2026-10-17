import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
test("video template and timed image layer export without an upload", async ({
  page,
}) => {
  test.setTimeout(45000);
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto("/preview");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Video Editor", exact: true }).click();
  await page
    .getByLabel("Choose video", { exact: true })
    .setInputFiles(join(__dirname, "fixtures", "clip.mp4"));
  await expect(
    page.getByRole("button", {
      name: "Export edited video locally",
      exact: true,
    }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /Quiet cinema/ }).click();
  await expect(page.getByLabel("Video format", { exact: true })).toHaveValue(
    "landscape",
  );
  await expect(page.getByLabel("Video speed", { exact: true })).toHaveValue(
    "0.75",
  );
  await page.getByLabel("Trim length seconds", { exact: true }).fill("1");
  await page.getByText("Image overlays · 0/6", { exact: true }).click();
  await page
    .getByLabel("Add video image overlays", { exact: true })
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8n8Lwn4GBgYGJAQoAJVcCZoqYhw8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.getByLabel("Layer 1 width", { exact: true })).toHaveValue(
    "30",
  );
  await page.getByLabel("Layer 1 opacity", { exact: true }).fill("50");
  await expect(
    page.getByLabel("Edited video preview", { exact: true }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export edited video locally", exact: true })
    .click();
  const file = await downloaded;
  expect((await readFile((await file.path())!)).byteLength).toBeGreaterThan(
    1000,
  );
  expect(posts).toEqual([]);
});
