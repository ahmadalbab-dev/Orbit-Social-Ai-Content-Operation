import {describe,expect,it} from "vitest";
import {AI_STUDIO_SCALE,codeCellOpacity,HERO_DISSOLVE_MS,HERO_SCENE_MS,heroSequence} from "./hero-sequence";
describe("continuous shared-position Orbit hero sequence",()=>{
 it("keeps readable titles and the requested ai studio scale",()=>{
  expect(AI_STUDIO_SCALE).toBe(.6);
  expect(heroSequence(1000)).toEqual({orbit:1,studio:0});
  expect(heroSequence(HERO_SCENE_MS+1000)).toEqual({orbit:0,studio:1});
 });
 it("dissolves both ways continuously including the loop boundary, without blank weights",()=>{
  for(let time=0;time<=HERO_SCENE_MS*2;time+=17){
   const state=heroSequence(time),next=heroSequence(time+17);
   expect(state.orbit+state.studio).toBeCloseTo(1);
   expect(state.orbit).toBeGreaterThanOrEqual(0);expect(state.studio).toBeGreaterThanOrEqual(0);
   expect(Math.abs(state.studio-next.studio)).toBeLessThan(.02);
  }
  expect(heroSequence(HERO_SCENE_MS-HERO_DISSOLVE_MS/2)).toEqual({orbit:.5,studio:.5});
  expect(heroSequence(HERO_SCENE_MS*2-HERO_DISSOLVE_MS/2)).toEqual({orbit:.5,studio:.5});
 });
 it("settles gently into each title rather than changing velocity suddenly",()=>{
  for(const boundary of [HERO_SCENE_MS-HERO_DISSOLVE_MS,HERO_SCENE_MS,HERO_SCENE_MS*2-HERO_DISSOLVE_MS,HERO_SCENE_MS*2]){
   expect(Math.abs(heroSequence(boundary-1).studio-heroSequence(boundary+1).studio)).toBeLessThan(.000001);
  }
 });
 it("shows stable Orbit for reduced motion at every cycle phase",()=>{
  for(const time of [0,8000,10000,17000,100000])expect(heroSequence(time,true)).toEqual({orbit:1,studio:0});
 });
 it("keeps each staggered code cell deterministic, monotonic and bounded",()=>{
  const mids=new Set<number>();
  for(let column=0;column<20;column++){
   let previous=0;
   expect(codeCellOpacity(0,column,3)).toBe(0);expect(codeCellOpacity(1,column,3)).toBe(1);
   for(let step=0;step<=100;step++){
    const value=codeCellOpacity(step/100,column,3);
    expect(value).toBeGreaterThanOrEqual(previous);expect(value).toBeLessThanOrEqual(1);previous=value;
   }
   mids.add(codeCellOpacity(.5,column,3));
  }
  expect(mids.size).toBeGreaterThan(2);
 });
});
