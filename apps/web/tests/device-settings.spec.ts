import {expect,test,type Page} from "@playwright/test";
async function settings(page:Page){await page.getByRole("button",{name:"Workspace Settings",exact:true}).click();}
test("profile is separate, system theme reacts and regional settings persist",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:"light"});await page.goto("/preview");
  await page.getByRole("button",{name:"Open profile",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Your brand profile",exact:true})).toBeVisible();
  await settings(page);
  await expect(page.getByRole("heading",{name:"Your brand profile",exact:true})).toBeHidden();
  await page.getByRole("button",{name:"System",exact:true}).click();
  await page.emulateMedia({colorScheme:"dark"});await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.emulateMedia({colorScheme:"light"});await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.getByRole("checkbox",{name:"Reduce decorative animation"}).check();
  await expect(page.locator("html")).toHaveAttribute("data-motion","paused");
  await page.getByLabel("City or area",{exact:true}).fill("Kuala Terengganu");
  await page.getByRole("button",{name:"Save device preferences",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved on this device");
  await page.reload();await settings(page);
  await expect(page.getByLabel("City or area",{exact:true})).toHaveValue("Kuala Terengganu");
  await expect(page.getByLabel("Timezone",{exact:true})).toHaveValue("Asia/Kuala_Lumpur");
  await expect(page.getByRole("checkbox",{name:"Reduce decorative animation"})).toBeChecked();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("GPS suggests a full city only after explicit action without geocoding requests",async({page,context})=>{
  await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:5.33,longitude:103.14});
  const requests:string[]=[];page.on("request",request=>{if(!new URL(request.url()).hostname.includes("localhost"))requests.push(request.url());});
  await page.goto("/preview");await settings(page);
  await expect(page.getByLabel("City or area",{exact:true})).toHaveValue("Kuala Lumpur");
  await page.getByRole("button",{name:"Use device location",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Nearest supported city: Kuala Terengganu");
  await expect(page.getByLabel("City or area",{exact:true})).toHaveValue("Kuala Terengganu");
  expect(requests).toEqual([]);
});
