import { describe, expect, it } from "vitest";
import { brandPayload, profileFromBrand } from "./brand-profile";
describe("Brand Memory API boundary", () => {
 it("round-trips language and topics through stored guidelines", () => {
  const profile = profileFromBrand({id:"brand-a",name:"Orbit",voice:"Santai",audience:"Creators",guidelines:{language:"English",topics:["KL","Kerja"]}});
  expect(profile.topics).toBe("KL, Kerja");
  expect(brandPayload(profile)).toEqual({name:"Orbit",voice:"Santai",audience:"Creators",language:"English",topics:["KL","Kerja"]});
  expect(brandPayload(profile)).not.toHaveProperty("id");
 });
 it("handles older brands without guidelines", () => {
  expect(profileFromBrand({id:"b",name:"Orbit",voice:"Warm",audience:"Creators"})).toMatchObject({language:"Bahasa Melayu",topics:""});
 });
});
