import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
function toneWav() {
  const rate = 16000,
    length = rate * 3,
    b = Buffer.alloc(44 + length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 2 * Math.PI * 880) * 12000),
      44 + i * 2,
    );
  return b;
}
test("uploaded music is encoded in the local edited video with measurable audio", async ({
  page,
}) => {
  test.setTimeout(60000);
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
  await page.getByLabel("Trim length seconds", { exact: true }).fill("1");
  await page.getByLabel("Video volume", { exact: true }).focus();
  await page.getByLabel("Video volume", { exact: true }).press("Home");
  await expect(page.getByLabel("Video volume", { exact: true })).toHaveValue("0");
  await page
    .locator(".video-controls")
    .getByLabel("Choose local music", { exact: true })
    .setInputFiles({
      name: "test-tone.wav",
      mimeType: "audio/wav",
      buffer: toneWav(),
    });
  await expect(
    page
      .locator(".video-controls")
      .getByLabel("Soundtrack offset", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".video-controls")
    .getByLabel("Soundtrack offset", { exact: true })
    .fill("0.5");
  await page
    .locator(".video-controls")
    .getByLabel("Soundtrack fadeIn", { exact: true })
    .fill("0.1");
  await page
    .locator(".video-controls")
    .getByLabel("Soundtrack fadeOut", { exact: true })
    .fill("0.1");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export edited video locally", exact: true })
    .click();
  const download = await pending;
  const bytes = await readFile((await download.path())!);
  const result = await page.evaluate(async (base64) => {
    const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const audio = new AudioContext();
    try {
      const buffer = await audio.decodeAudioData(data.buffer.slice(0));
      let sum = 0;
      for (const value of buffer.getChannelData(0)) sum += value * value;
      return {
        duration: buffer.duration,
        rms: Math.sqrt(sum / buffer.length),
        channels: buffer.numberOfChannels,
      };
    } finally {
      await audio.close();
    }
  }, bytes.toString("base64"));
  expect(result.duration).toBeGreaterThan(0.7);
  expect(result.duration).toBeLessThan(2);
  expect(result.channels).toBeGreaterThan(0);
  expect(result.rms).toBeGreaterThan(0.005);
  expect(posts).toEqual([]);
});
