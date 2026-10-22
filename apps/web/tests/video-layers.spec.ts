import { selectEditorTool } from './editor-helpers';
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
  await page.goto("/preview/editor/video");
  await page
    .getByLabel("Choose video", { exact: true })
    .setInputFiles(join(__dirname, "fixtures", "clip.mp4"));
  await selectEditorTool(page, "Video", "Export");
  await expect(
    page.getByRole("button", {
      name: "Export edited video locally",
      exact: true,
    }),
  ).toBeEnabled();
  await selectEditorTool(page, "Video", "Templates");
  await page.getByText("Explore frame and title styles", { exact: true }).click();
  await page.getByRole("button", { name: /Quiet cinema/ }).click();
  await expect(page.getByLabel("Video format", { exact: true })).toHaveValue(
    "landscape",
  );
  await expect(page.getByLabel("Video speed", { exact: true })).toHaveValue(
    "0.75",
  );
  await selectEditorTool(page, "Video", "Adjust & text");
  await page.getByLabel("Trim length seconds", { exact: true }).fill("1");
  await selectEditorTool(page, "Video", "Layers");
  await expect(page.getByLabel("Add video image overlays", { exact: true })).toBeVisible();
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
  await selectEditorTool(page, "Video", "Export");
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

test('a 12MP overlay survives resizing and remains present in the exported movie',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/preview/editor/video');
 await page.getByLabel('Choose video',{exact:true}).setInputFiles(join(__dirname,'fixtures','clip.mp4'));
 await selectEditorTool(page,'Video','Adjust & text');
 await page.getByLabel('Trim length seconds',{exact:true}).fill('1');
 const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=4032;c.height=3024;const x=c.getContext('2d')!;x.fillStyle='#ff0000';x.fillRect(0,0,c.width,c.height);return c.toDataURL().split(',')[1];});
 await selectEditorTool(page,'Video','Layers');
 await page.getByLabel('Add video image overlays',{exact:true}).setInputFiles({name:'large-photo.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await expect(page.getByLabel('Layer 1 width',{exact:true})).toHaveValue('30');
 await expect(page.getByText('The overlay was resized for editing. Your original file is unchanged.',{exact:true})).toBeVisible();
 await selectEditorTool(page,'Video','Export');
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export edited video locally',exact:true}).click();
 const download=await pending,bytes=await readFile((await download.path())!);
 const output=await page.evaluate(async encoded=>{
  const bytes=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));
  try{const v=document.createElement('video');v.muted=true;v.src=url;await new Promise<void>((resolve,reject)=>{v.onloadeddata=()=>resolve();v.onerror=()=>reject(Error('Export decode failed'));});
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')!.drawImage(v,0,0);
   return {width:v.videoWidth,height:v.videoHeight,pixel:Array.from(c.getContext('2d')!.getImageData(Math.round(c.width*.1),Math.round(c.height*.1),1,1).data)};
  }finally{URL.revokeObjectURL(url);}
 },bytes.toString('base64'));
 expect(output.width).toBeGreaterThan(0);expect(output.height).toBeGreaterThan(0);
 expect(output.pixel[0]).toBeGreaterThan(180);expect(output.pixel[1]).toBeLessThan(80);expect(output.pixel[2]).toBeLessThan(80);
});
