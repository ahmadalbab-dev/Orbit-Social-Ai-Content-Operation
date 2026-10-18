import {expect,test} from "@playwright/test";
test("each social connect button opens useful provider setup instead of a dead link",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/preview");
 await page.getByRole("button",{name:"Connections",exact:true}).click();
 for(const [id,name,fragment] of [["facebook","Facebook","pages-api"],["instagram","Instagram","instagram-platform"],["threads","Threads","threads"]]){
  await page.getByRole("button",{name:`Connect ${id}`,exact:true}).click();
  const dialog=page.getByRole("dialog",{name:`Connect ${name}`,exact:true});await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("No social account will be authorised here");
  await expect(dialog.getByRole("link",{name:`Official ${name} setup`})).toHaveAttribute("href",new RegExp(`^https://developers\\.facebook\\.com/docs/${fragment}/`));
  await dialog.getByRole("button",{name:"Refresh connection status",exact:true}).click();await expect(dialog.getByRole("status")).toContainText("Sign in to check");
  await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button",{name:`Connect ${id}`,exact:true})).toBeFocused();
 }
});
