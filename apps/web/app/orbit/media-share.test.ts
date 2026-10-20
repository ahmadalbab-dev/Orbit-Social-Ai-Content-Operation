import {describe,expect,it,vi} from "vitest";
import {shareMediaFile} from "./media-share";

describe("local exported media sharing",()=>{
 const file=new File(["local exported bytes"],"orbit-edited.png",{type:"image/png"});
 it("passes the actual file to the native share menu without a provider or URL",async()=>{
  const canShare=vi.fn(()=>true),share=vi.fn(async()=>{});
  expect(await shareMediaFile(file,{canShare,share})).toBe("shared");
  expect(canShare).toHaveBeenCalledExactlyOnceWith({files:[file]});
  expect(share).toHaveBeenCalledExactlyOnceWith({files:[file]});
 });
 it("keeps unsupported or unshareable files available for the download fallback",async()=>{
  const share=vi.fn(async()=>{});
  expect(await shareMediaFile(file,{})).toBe("unsupported");
  expect(await shareMediaFile(file,{share})).toBe("unsupported");
  expect(await shareMediaFile(file,{share,canShare:()=>false})).toBe("unsupported");
  expect(share).not.toHaveBeenCalled();expect(await file.text()).toBe("local exported bytes");
 });
 it("treats cancelling the share menu as cancellation, not a successful post",async()=>{
  const error=new Error("cancelled");error.name="AbortError";
  expect(await shareMediaFile(file,{canShare:()=>true,share:async()=>{throw error;}})).toBe("cancelled");
 });
 it("contains capability and handoff errors without losing exported bytes",async()=>{
  expect(await shareMediaFile(file,{canShare:()=>{throw Error("blocked");},share:async()=>{}})).toBe("failed");
  expect(await shareMediaFile(file,{canShare:()=>true,share:async()=>{throw Error("target failed");}})).toBe("failed");
  expect(await file.text()).toBe("local exported bytes");
 });
});
