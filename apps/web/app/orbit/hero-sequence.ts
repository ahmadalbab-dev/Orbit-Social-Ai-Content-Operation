export const HERO_SCENE_MS = 9000;
// Original renderer: 1.3 s switching window plus .45 s character settling.
export const HERO_TRANSITION_MS = 1750;
export const AI_STUDIO_SCALE = 1;
const clamp = (value:number) => Math.max(0,Math.min(1,value));
const smooth = (value:number) => { const x=clamp(value);return x*x*(3-2*x); };
/** Nine readable seconds, then a directional character transition; never a blank scene. */
export function heroSequence(elapsed:number,reduced=false) {
  if(reduced)return {orbit:1,studio:0,progress:0,toStudio:true};
  const duration=HERO_SCENE_MS+HERO_TRANSITION_MS;
  const time=Math.max(0,elapsed)%(duration*2),toStudio=time<duration;
  const progress=clamp(((time%duration)-HERO_SCENE_MS)/HERO_TRANSITION_MS);
  return {orbit:toStudio?1-progress:progress,studio:toStudio?progress:1-progress,progress,toStudio};
}
/** A lower row changes before every higher row; tiny column jitter keeps the code texture alive. */
export function heroCellBlend(progress:number,rowPosition:number,column=0) {
  if(progress<=0)return 0;if(progress>=1)return 1;
  const hash=Math.sin(column*127.1+31.7)*43758.5453;
  const start=(1-clamp(rowPosition))*.72+(hash-Math.floor(hash))*.025;
  return smooth((progress-start)/.255);
}
/** Increasing source-row offsets move code upwards through fixed screen rows. */
export function heroCodeRow(elapsed:number,reduced=false) {
  return reduced?0:Math.floor(Math.max(0,elapsed)/1000*1.1);
}
/** Shared occupied cells never disappear while their surrounding silhouette changes. */
export function heroCellCoverage(previous:number,next:number,blend:number) {
  return previous+(next-previous)*clamp(blend);
}
