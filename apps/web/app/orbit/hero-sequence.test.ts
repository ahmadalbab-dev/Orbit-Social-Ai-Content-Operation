import {describe,expect,it} from "vitest";
import {AI_STUDIO_SCALE,codeCellOpacity,HERO_SCENE_MS,heroSequence} from "./hero-sequence";
describe("shared-position Orbit hero sequence",()=>{
 it("holds each title for the nine-second reference scene cadence",()=>{
  expect(HERO_SCENE_MS).toBe(9000);expect(AI_STUDIO_SCALE).toBe(.6);
  expect(heroSequence(1000)).toEqual({orbit:1,studio:0});
  expect(heroSequence(10000)).toEqual({orbit:0,studio:1});
  expect(heroSequence(19000)).toEqual({orbit:1,studio:0});
 });
 it("cross dissolves both directions without a blank frame",()=>{
  for(const at of [7500,8000,8250,8500,8999,16500,17000,17250,17999]){
   const state=heroSequence(at);expect(state.orbit+state.studio).toBeCloseTo(1);
   expect(state.orbit).toBeGreaterThanOrEqual(0);expect(state.studio).toBeGreaterThanOrEqual(0);
  }
  expect(heroSequence(8250)).toEqual({orbit:.5,studio:.5});
 });
 it("shows a stable Orbit title for reduced motion",()=>{expect(heroSequence(10000,true)).toEqual({orbit:1,studio:0});});
 it("dissolves individual code cells deterministically with bounded opacity",()=>{
  expect(codeCellOpacity(0,2,3)).toBe(0);expect(codeCellOpacity(1,2,3)).toBe(1);
  const samples=Array.from({length:20},(_,index)=>codeCellOpacity(.5,index,3));
  expect(samples.every(value=>value>=0&&value<=1)).toBe(true);expect(new Set(samples).size).toBeGreaterThan(2);
  expect(codeCellOpacity(.5,2,3)).toBe(codeCellOpacity(.5,2,3));
 });
});
