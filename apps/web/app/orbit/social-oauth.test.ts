import {describe,expect,it} from "vitest";
import {socialOAuthAuthorization} from "./social-oauth";
describe("official social OAuth consent navigation",()=>{
 it("accepts only the official consent hosts for the selected provider",()=>{
  for(const host of ["facebook.com","www.facebook.com"]){const url=`https://${host}/v25.0/dialog/oauth?client_id=fixture&state=opaque`;expect(socialOAuthAuthorization(url,"facebook")).toBe(url);expect(socialOAuthAuthorization(url,"instagram")).toBe(url);}
  for(const host of ["threads.com","www.threads.com"]){const url=`https://${host}/oauth/authorize?client_id=fixture&state=opaque`;expect(socialOAuthAuthorization(url,"threads")).toBe(url);}
 });
 it.each([
  'https://attacker.test/oauth/authorize',
  'https://threads.com.attacker.test/oauth/authorize',
  'https://www.facebook.com/v25.0/dialog/oauth',
  'https://api.orbit.test/v1/oauth/threads/launch',
  'https://threads.com:444/oauth/authorize',
  'https://threads.com/oauth/authorize#fragment',
  'https://username:password@threads.com/oauth/authorize',
  'http://threads.com/oauth/authorize',
  'javascript:alert(1)',
 ])("rejects unexpected consent destinations without exposing the returned URL",url=>{
  expect(()=>socialOAuthAuthorization(url,"threads")).toThrow("The account connection could not be opened.");
 });
});
it('allows only the official TikTok consent host',()=>{
 const url='https://www.tiktok.com/v2/auth/authorize/?client_key=fixture&state=opaque';expect(socialOAuthAuthorization(url,'tiktok')).toBe(url);
 for(const invalid of ['https://www.tiktok.com.attacker.test/v2/auth/authorize/','https://www.facebook.com/v25.0/dialog/oauth','https://www.tiktok.com:444/v2/auth/authorize/','https://user:pass@www.tiktok.com/v2/auth/authorize/'])expect(()=>socialOAuthAuthorization(invalid,'tiktok')).toThrow();
});
