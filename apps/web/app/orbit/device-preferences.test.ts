import {describe,it,expect} from "vitest";
import {dateKeyInZone,defaultPreferences,isTimeZone,nearestCity,sanitizePreferences,scheduledInstant} from "./device-preferences";
describe("device location and regional preferences",()=>{
  it("uses full city names with real IANA zones",()=>{expect(nearestCity(5.33,103.14)).toMatchObject({name:"Kuala Terengganu",timeZone:"Asia/Kuala_Lumpur"});expect(nearestCity(1.553,110.359)).toMatchObject({name:"Kuching",timeZone:"Asia/Kuching"});expect(isTimeZone("Asia/Kuala_Terengganu")).toBe(false);});
  it("does not invent a Malaysian city for worldwide GPS",()=>{expect(nearestCity(51.5,-.12)).toBe(null);expect(nearestCity(NaN,100)).toBe(null);});
  it("validates untrusted persisted preferences",()=>{expect(sanitizePreferences({city:" ",timeZone:"invalid",locale:"xx",dateStyle:"long"})).toEqual(defaultPreferences);expect(sanitizePreferences({city:"London",timeZone:"Europe/London",hour12:true})).toMatchObject({city:"London",timeZone:"Europe/London",hour12:true});});
  it("groups the same instant by the selected local calendar day",()=>{const date=new Date("2026-10-17T18:00:00Z");expect(dateKeyInZone(date,"Asia/Kuala_Lumpur")).toBe("2026-10-18");expect(dateKeyInZone(date,"America/New_York")).toBe("2026-10-17");});
  it("schedules Kuala Lumpur and fractional-offset zones accurately",()=>{expect(scheduledInstant("2026-10-18T09:30","Asia/Kuala_Lumpur")).toBe("2026-10-18T01:30:00.000Z");expect(scheduledInstant("2026-10-18T09:30","Asia/Kathmandu")).toBe("2026-10-18T03:45:00.000Z");});
  it("uses DST rules rather than a fixed offset",()=>{expect(scheduledInstant("2026-07-18T09:00","Europe/London")).toBe("2026-07-18T08:00:00.000Z");expect(scheduledInstant("2026-12-18T09:00","Europe/London")).toBe("2026-12-18T09:00:00.000Z");});
  it("rejects nonexistent or repeated wall times instead of shifting schedules",()=>{expect(()=>scheduledInstant("2026-03-08T02:30","America/New_York")).toThrow("does not exist");expect(()=>scheduledInstant("2026-11-01T01:30","America/New_York")).toThrow("occurs twice");expect(()=>scheduledInstant("2026-02-30T09:00","UTC")).toThrow("valid");});
});
