import {describe,expect,it} from 'vitest';
import {AI_STUDIO_SCALE,HERO_SCENE_MS,HERO_TRANSITION_MS,heroSequence,heroCellBlend,heroCellCoverage,heroCodeRow} from './hero-sequence';
describe('Ponytail-style upward Orbit code field',()=>{
 it('holds each readable title for nine seconds and preserves ai studio scale',()=>{
  expect(AI_STUDIO_SCALE).toBe(.6);
  const duration=HERO_SCENE_MS+HERO_TRANSITION_MS;
  for(const t of [0,4500,HERO_SCENE_MS])expect(heroSequence(t)).toMatchObject({orbit:1,studio:0});
  for(const t of [duration,duration+4500,duration+HERO_SCENE_MS])expect(heroSequence(t)).toMatchObject({orbit:0,studio:1});
 });
 it('changes the bottom of both silhouettes before the top',()=>{
  for(const column of [0,7,23]){
   expect(heroCellBlend(.2,.95,column)).toBeGreaterThan(0);
   expect(heroCellBlend(.2,.05,column)).toBe(0);
   expect(heroCellBlend(.7,.95,column)).toBe(1);
   expect(heroCellBlend(.7,.05,column)).toBeLessThan(1);
  }
  expect(heroSequence(HERO_SCENE_MS+HERO_TRANSITION_MS/2)).toMatchObject({progress:.5,toStudio:true});
  expect(heroSequence((HERO_SCENE_MS+HERO_TRANSITION_MS)*2-HERO_TRANSITION_MS/2)).toMatchObject({progress:.5,toStudio:false});
 });
 it('keeps row transitions monotonic and shared code cells fully visible',()=>{
  for(const row of [0,.25,.5,.75,1]){
   let previous=0;
   for(let step=0;step<=100;step++){
    const blend=heroCellBlend(step/100,row,7);
    expect(blend).toBeGreaterThanOrEqual(previous);expect(blend).toBeLessThanOrEqual(1);previous=blend;
    expect(heroCellCoverage(1,1,blend)).toBe(1);
    expect(heroCellCoverage(.8,.8,blend)).toBe(.8);
   }
  }
 });
 it('uses a single upward source grid, with no horizontal row scrolling',()=>{
  expect(heroCodeRow(0)).toBe(0);expect(heroCodeRow(1000)).toBe(1);expect(heroCodeRow(2000)).toBe(2);
  expect(heroCodeRow(100000,true)).toBe(0);
 });
 it('holds stable Orbit with reduced motion and keeps the loop continuous',()=>{
  const duration=HERO_SCENE_MS+HERO_TRANSITION_MS;
  for(const t of [0,10000,21000,100000])expect(heroSequence(t,true)).toMatchObject({orbit:1,studio:0,progress:0});
  for(let t=0;t<=duration*2;t+=17){const a=heroSequence(t),b=heroSequence(t+17);expect(a.orbit+a.studio).toBe(1);expect(Math.abs(a.studio-b.studio)).toBeLessThan(.011);}
 });
});
