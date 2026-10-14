import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

test("creator studio saves edits and approves the returned revision before scheduling", async ({ page }) => {
  let revision=1;
  let status="DRAFT";
  const variants=[{platform:"threads",copy:"Cari kerja area mana?",hashtags:["#CariKerja"],callToAction:"Kongsi kawasan korang."}];
  const item=()=>({id:"content-1",topic:"Kerja",revision,status,source:"demo",variants});
  await page.route("**/v1/**",async route=>{
    const request=route.request();
    const path=new URL(request.url()).pathname;
    if(path.endsWith("/integrations/status"))return route.fulfill({json:{connectorMode:"mock",providers:{}}});
    if(path.endsWith("/brands"))return route.fulfill({json:{id:"brand-1"}});
    if(path.endsWith("/generate"))return route.fulfill({json:item()});
    if(path.endsWith("/review")) {const body=request.postDataJSON();expect(body.expectedRevision).toBe(revision);variants[0]=body.variants[0];revision++;status="DRAFT";return route.fulfill({json:item()});}
    if(path.endsWith("/approve")) {expect(request.postDataJSON().expectedRevision).toBe(revision);status="APPROVED";return route.fulfill({json:item()});}
    if(path.endsWith("/schedule")) {expect(request.postDataJSON().expectedRevision).toBe(revision);expect(request.postDataJSON().scheduledFor).toBe("2030-01-02T12:00:00.000Z");status="SCHEDULED";return route.fulfill({json:item()});}
    return route.fulfill({json:[]});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"Content Studio",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Create once. Review every channel."})).toBeVisible();
  await page.getByRole("button",{name:"Generate draft"}).click();
  await page.getByRole("textbox",{name:"threads copy"}).fill("Kerja dekat rumah atau jauh sikit?");
  await expect(page.getByRole("button",{name:"Record schedule"})).toBeDisabled();
  await page.getByRole("button",{name:"Approve content"}).click();
  await expect(page.getByRole("status")).toContainText("Approved revision");
  await page.getByLabel("Schedule time Malaysia").fill("2030-01-02T20:00");
  await page.getByRole("button",{name:"Record schedule"}).click();
  await expect(page.getByRole("status")).toContainText("No background publishing worker");
});

test("news editor exports source duration and approved title settings", async ({page}) => {
  await page.route("**/v1/**",route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith("/content")?[]:{providers:{}}}));
  await page.goto("/");
  await page.getByRole("button",{name:"Content Studio",exact:true}).click();
  await page.getByRole("button",{name:"Video Editor"}).click();
  await page.getByLabel("Choose video").setInputFiles(path.join(process.cwd(),"tests/fixtures/sample.mp4"));
  await page.getByLabel("Video date").fill("2026-10-14");
  await page.getByLabel("Video title").fill("Pemandangan terkini\ndi sekitar Kuala Lumpur");
  await expect(page.getByRole("button",{name:"Export render settings"})).toBeEnabled();
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export render settings"}).click();
  const download=await downloaded;
  const settings=JSON.parse(await fs.readFile((await download.path())!,"utf8"));
  expect(settings).toMatchObject({template:"News report",panelOpacity:0.35,titleFontSize:27,width:512,height:910,fps:30,durationInFrames:30,date:"14 OKTOBER 2026"});
  await expect(page.locator(".video-controls").getByRole("status").filter({hasText:"Settings exported"})).toContainText("Settings exported");
});

test("failed approval never displays success",async({page})=>{
  await page.route("**/v1/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith("/brands"))return route.fulfill({json:{id:"brand-1"}});
    if(path.endsWith("/generate"))return route.fulfill({json:{id:"one",revision:1,status:"DRAFT",variants:[{platform:"threads",copy:"Draf",hashtags:[],callToAction:""}]}});
    if(path.endsWith("/approve"))return route.fulfill({status:403,json:{message:"Approval role required"}});
    if(path.endsWith("/integrations/status"))return route.fulfill({json:{providers:{}}});
    return route.fulfill({json:[]});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"Content Studio",exact:true}).click();await page.getByRole("button",{name:"Generate draft"}).click();await page.getByRole("button",{name:"Approve content"}).click();
  await expect(page.getByRole("status")).toHaveText("Approval role required");
  await expect(page.getByRole("button",{name:"Simulate publishing"})).toBeDisabled();
});

test("business profile persists and news editor has transparent panel controls",async({page})=>{
  await page.route("**/v1/**",route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith("/content")?[]:{providers:{}}}));
  await page.goto("/");
  await page.getByRole("button",{name:"Content Studio",exact:true}).click();await page.getByRole("button",{name:"Brand Settings"}).click();
  await page.getByRole("button",{name:"Business",exact:true}).click();await page.getByLabel("Brand or creator name").fill("Kedai Saya");await page.getByRole("button",{name:"Save profile"}).click();
  await page.reload();await expect(page.locator(".hero-platforms")).toContainText("Kedai Saya");
  await page.getByRole("button",{name:"Video Editor"}).click();
  await expect(page.getByRole("heading",{name:"A story worth sharing."})).toBeVisible();
  await expect(page.getByLabel("Panel opacity",{exact:true})).toHaveValue("35");
  await expect(page.getByRole("button",{name:"Export render settings"})).toBeDisabled();
  await page.getByRole("button",{name:"Connections",exact:true}).click();
  await expect(page.getByText("OAuth setup pending",{exact:true})).toHaveCount(3);
});


for (const width of [320,390]) test(`mobile navigation reaches every tab at ${width}px without horizontal overflow`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.route("**/v1/**",route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith("/content")?[]:{providers:{}}}));
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/More ideas/})).toBeVisible();
  const checkWidth=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await checkWidth();
  for(const label of ["Content Studio","Video Editor","Calendar"]){await page.getByRole("button",{name:label,exact:true}).click();await checkWidth();}
  await page.getByRole("button",{name:"More tabs",exact:true}).click();
  await page.locator("#orbit-more").getByRole("button",{name:"Channels",exact:true}).click();
  await expect(page.getByRole("heading",{name:"One workspace. Your channels."})).toBeVisible();await checkWidth();
  await page.getByRole("button",{name:"More tabs",exact:true}).click();
  await page.locator("#orbit-more").getByRole("button",{name:"Settings",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Make it sound like you."})).toBeVisible();await checkWidth();
});

test("switching tabs retains an unsaved channel draft",async({page})=>{
  await page.route("**/v1/**",route=>{const path=new URL(route.request().url()).pathname;return route.fulfill({json:path.endsWith("/brands")?{id:"b"}:path.endsWith("/generate")?{id:"c",status:"DRAFT",revision:1,variants:[{platform:"threads",copy:"Draft",hashtags:[],callToAction:""}]}:path.endsWith("/content")?[]:{providers:{}}});});
  await page.goto("/");await page.getByRole("button",{name:"Content Studio",exact:true}).click();
  await page.getByRole("button",{name:"Generate draft",exact:true}).click();
  await page.getByLabel("threads copy",{exact:true}).fill("Keep this unsaved text");
  await page.getByRole("button",{name:"Video Editor",exact:true}).click();
  await page.getByRole("button",{name:"Content Studio",exact:true}).click();
  await expect(page.getByLabel("threads copy",{exact:true})).toHaveValue("Keep this unsaved text");
  await expect(page.getByRole("button",{name:"Record schedule",exact:true})).toBeDisabled();
});
