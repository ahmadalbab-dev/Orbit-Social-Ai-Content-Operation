"use client";
import {useEffect,useRef} from 'react';
import {AI_STUDIO_SCALE,heroCellBlend,heroCellCoverage,heroCodeRow,heroSequence} from './hero-sequence';

// Rendering adapted from Ponytail 5 site.js, DietrichGebert (MIT).
// See docs/licenses/PONYTAIL_MIT.txt. The code texture and masks retain Orbit branding.
const SOURCE = `import { useState, useRef, useEffect } from "react";
import { Image, Video, Calendar, Sparkles } from "lucide-react";
import { Button } from "./ui";
type Channel = "facebook" | "instagram" | "threads" | "tiktok";
type Draft = { id: string; revision: number; copy: string; channels: Channel[] };
function ContentStudio({ workspace, brand, onReview }) {
 const [brief, setBrief] = useState("");
 const [draft, setDraft] = useState<Draft | null>(null);
 const [busy, setBusy] = useState(false);
 const pending = useRef<AbortController | null>(null);
 useEffect(() => () => pending.current?.abort(), []);
 async function prepare() {
  if (busy || !brief.trim()) return;
  const controller = new AbortController(); pending.current = controller;
  setBusy(true);
  try {
   const next = await workspace.prepare({ topic: brief, brand, channels: ["facebook", "instagram", "threads"], language: "Bahasa Melayu", signal: controller.signal });
   setDraft(next);
  } finally { setBusy(false); pending.current = null; }
 }
 return <section aria-label="Content studio"><label>Your next idea<textarea value={brief} onChange={event => setBrief(event.target.value)} /></label><Button disabled={busy || !brief.trim()} onClick={prepare}><Sparkles />Prepare draft</Button>{draft && <DraftReview revision={draft.revision} onReview={onReview} />}</section>;
}
function MediaEditor({ image, video, current, apply, undo }) {
 const [instruction, setInstruction] = useState("");
 const [proposed, setProposed] = useState(null);
 const preview = useRef<HTMLCanvasElement | null>(null);
 const layers = current.layers.map(layer => ({ ...layer, opacity: Math.max(0, Math.min(1, layer.opacity)) }));
 function review(change) { setProposed({ ...change, revision: current.revision }); }
 function confirm() { if (proposed?.revision === current.revision) apply(proposed.changes); }
 return <main><canvas ref={preview} /><Layers value={layers} /><ImageTools image={image} /><VideoTools video={video} /><Button onClick={confirm}>Apply edit</Button><Button onClick={undo}>Undo</Button></main>;
}
function PlanCalendar({ drafts, timezone = "Asia/Kuala_Lumpur" }) {
 const approved = drafts.filter(draft => draft.status === "APPROVED");
 return approved.map(draft => <CalendarEntry key={draft.id} revision={draft.revision} timezone={timezone} />);
}
const workflow = { create: "Words, images and video", review: "Your approval", schedule: "Your calendar" };
export { ContentStudio, MediaEditor, PlanCalendar, workflow };`.replace(/\s+/g,' ');
const GLYPHS='01<>{}[]=+*#%$/\\|';
type Box={left:number;top:number;right:number;bottom:number};
type Mask={set:Uint8Array;box:Box};
type Cell={index:number;x:number;y:number;rowPosition:number};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const mix=(a:readonly number[],b:readonly number[],amount:number)=>a.map((value,index)=>Math.round(value+(b[index]-value)*amount));
const rgb=(values:readonly number[],alpha=1)=>`rgba(${values.join(',')},${alpha})`;
function hash(a:number,b:number){let value=(a*374761393+b*668265263)|0;value=(value^(value>>>13))*1274126177;return ((value^(value>>>16))>>>0)/4294967295;}

export function OrbitField({paused,centered=false}:{paused:boolean;centered?:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 const savedElapsed=useRef(0);
 useEffect(()=>{
  const element=canvas.current,context=element?.getContext('2d');
  if(!element||!context)return;
  const ambient=document.createElement('canvas'),background=ambient.getContext('2d');
  if(!background)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,onScreen=true,frame=0,width=0,height=0,elapsed=savedElapsed.current,lastTick=0,lastPaint=0;
  let fontSize=13,columnWidth=8,lineHeight=17,columns=0,rows=0,cachedRow=-1;
  let orbit:Mask,studio:Mask,cells:Cell[]=[],union:Box={left:0,top:0,right:0,bottom:0};
  let dark=true,colours:number[][]=[];
  const frozen=()=>paused||reduced.matches;
  const active=()=>!disposed&&!document.hidden&&onScreen&&!frozen();
  const font=(weight:number,size=fontSize)=>`${weight} ${size}px "JetBrains Mono", ui-monospace, monospace`;
  function palette(){
   dark=document.documentElement.dataset.theme!=='light';
   // Ponytail's original holographic dark stops; deliberately ink-rich light adaptation.
   const stops=dark?[[127,227,245],[180,156,255],[255,159,216]]:[[0,79,96],[70,25,148],[151,15,92]];
   colours=Array.from({length:64},(_,index)=>{
    const point=index/63*2,segment=Math.min(1,Math.floor(point));
    return mix(stops[segment],stops[segment+1],point-segment);
   });
   cachedRow=-1;
   element!.dataset.palette=dark?'holographic':'saturated-ink';
  }
  function charAt(x:number,y:number,row:number){const value=SOURCE[((y+row)*columns+x)%SOURCE.length];return value===' '?'·':value;}
  function drawBackground(row:number){
   background!.clearRect(0,0,width,height);background!.font=font(400);background!.textBaseline='alphabetic';
   background!.fillStyle=dark?'rgba(198,181,160,.09)':'rgba(55,32,78,.085)';
   // One cached code grid: spaces remain spaces in the ambient field.
   for(let y=0;y<rows;y++){
    const offset=((y+row)*columns)%SOURCE.length;
    const line=(SOURCE.slice(offset)+SOURCE.repeat(Math.ceil(columns/SOURCE.length)+1)).slice(0,columns);
    background!.fillText(line,0,(y+1)*lineHeight);
   }
   cachedRow=row;
  }
  function colourAt(cell:Cell,box:Box,time:number){
   const fx=(cell.x-box.left)/Math.max(1,box.right-box.left),fy=(cell.y-box.top)/Math.max(1,box.bottom-box.top);
   const point=clamp(fx*.7+fy*.3+.06*Math.sin(time*.35+cell.y*.05));
   const colour=colours[Math.round(point*63)];
   const distance=(fx-fy*.45)-(((time*.11)%1.6)-.3);
   // Preserve the original soft travelling highlight without bleaching the light theme.
   const sweep=(dark?.4:.12)*Math.exp(-distance*distance/.004);
   return mix(colour,[255,255,255],sweep);
  }
  function draw(now:number){
   frame=0;
   if(disposed||!width||!height)return;
   if(active()){
    if(lastTick)elapsed+=Math.min(100,Math.max(0,now-lastTick));savedElapsed.current=elapsed;lastTick=now;
    if(lastPaint&&now-lastPaint<1000/30){frame=requestAnimationFrame(draw);return;}
   }else lastTick=0;
   lastPaint=now;
   const time=reduced.matches?0:elapsed,state=heroSequence(time,reduced.matches),sourceRow=heroCodeRow(time,reduced.matches);
   if(sourceRow!==cachedRow)drawBackground(sourceRow);
   context!.clearRect(0,0,width,height);context!.globalAlpha=1;context!.drawImage(ambient,0,0,width,height);
   context!.font=font(800);context!.textBaseline='alphabetic';
   element!.dataset.scene=state.studio>.5?'ai-studio':'orbit';
   element!.dataset.motion=frozen()?'paused':active()?'running':'suspended';
   element!.dataset.direction='bottom-to-top';
   element!.dataset.transition=state.progress.toFixed(3);
   element!.dataset.codeRow=String(sourceRow);
   const seconds=time/1000;
   for(const cell of cells){
    const previous=state.toStudio?orbit.set[cell.index]:studio.set[cell.index];
    const next=state.toStudio?studio.set[cell.index]:orbit.set[cell.index];
    const blend=heroCellBlend(state.progress,cell.rowPosition,cell.x);
    const opacity=heroCellCoverage(previous,next,blend);
    if(opacity<.012)continue;
    const switching=previous!==next&&blend>0&&blend<1;
    const selected=(blend>=.5?state.toStudio:!state.toStudio)?studio:orbit;
    const colour=colourAt(cell,selected.box,seconds);
    const character=switching?GLYPHS[Math.floor(hash(cell.index,Math.floor(seconds*18))*GLYPHS.length)]:charAt(cell.x,cell.y,sourceRow);
    context!.globalAlpha=opacity*(dark?.10:.065);context!.fillStyle=rgb(colour);
    context!.fillRect(cell.x*columnWidth,cell.y*lineHeight+3,columnWidth+.5,lineHeight+.5);
    context!.globalAlpha=opacity;context!.fillStyle=rgb(dark?mix(colour,[255,255,255],.08):colour);
    // A small character glow, never a filled word underlay. Bound work at 4K and 30 fps.
    context!.shadowColor=rgb(colour,dark?.65:.18);context!.shadowBlur=dark?(width<700?2:4):1;
    context!.fillText(character,cell.x*columnWidth,(cell.y+1)*lineHeight);context!.shadowBlur=0;
   }
   context!.globalAlpha=1;
   if(active())frame=requestAnimationFrame(draw);
  }
  function refresh(){cancelAnimationFrame(frame);frame=0;lastTick=0;lastPaint=0;palette();draw(performance.now());}
  function makeMask(kind:'orbit'|'studio',size:number,left:number,total:number,cy:number):Mask{
   const mask=document.createElement('canvas');
   const maskRatio=Math.min(1,Math.sqrt(2_000_000/(width*height)));
   mask.width=Math.max(1,Math.round(width*maskRatio));mask.height=Math.max(1,Math.round(height*maskRatio));
   const ink=mask.getContext('2d')!;ink.setTransform(maskRatio,0,0,maskRatio,0,0);ink.fillStyle='#fff';ink.textBaseline='middle';
   const logo=size*.7,gap=size*.14;
   if(kind==='orbit'){
    ink.font=font(800,size);ink.fillText('Orbit',left+logo+gap,cy);
    ink.save();ink.translate(left+logo/2,cy);ink.strokeStyle='#fff';ink.lineWidth=logo*.065;
    ink.beginPath();ink.arc(0,0,logo*.3,0,Math.PI*2);ink.stroke();
    ink.rotate(-.6);ink.beginPath();ink.ellipse(0,0,logo*.46,logo*.19,0,0,Math.PI*2);ink.stroke();ink.rotate(.6);
    ink.beginPath();ink.arc(0,0,logo*.085,0,Math.PI*2);ink.fill();ink.beginPath();ink.arc(logo*.35,-logo*.25,logo*.085,0,Math.PI*2);ink.fill();ink.restore();
   }else{ink.font=font(800,size*AI_STUDIO_SCALE);ink.textAlign='center';ink.fillText('ai studio',left+total/2,cy);}
   const sampled=document.createElement('canvas');sampled.width=columns;sampled.height=rows;
   const sample=sampled.getContext('2d',{willReadFrequently:true})!;sample.imageSmoothingEnabled=true;sample.imageSmoothingQuality='high';
   sample.drawImage(mask,0,0,columns,rows);
   const pixels=sample.getImageData(0,0,columns,rows).data,set=new Uint8Array(columns*rows);
   const box={left:columns,top:rows,right:0,bottom:0};
   for(let index=0;index<set.length;index++)if(pixels[index*4+3]/255>.24){
    set[index]=1;const x=index%columns,y=Math.floor(index/columns);
    box.left=Math.min(box.left,x);box.top=Math.min(box.top,y);box.right=Math.max(box.right,x);box.bottom=Math.max(box.bottom,y);
   }
   return {set,box};
  }
  function resize(){
   if(disposed)return;
   const rect=element!.getBoundingClientRect();width=rect.width;height=rect.height;
   cancelAnimationFrame(frame);frame=0;lastTick=0;lastPaint=0;if(!width||!height)return;
   const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(6_000_000/(width*height)));
   for(const surface of [element!,ambient]){surface.width=Math.max(1,Math.round(width*ratio));surface.height=Math.max(1,Math.round(height*ratio));surface.getContext('2d')!.setTransform(ratio,0,0,ratio,0,0);}
   // Small silhouettes need a denser code grid: a 75px letter must not collapse
   // to four coarse rows. Keep at least seven to eight rows of actual glyphs.
   fontSize=width<700?Math.max(6.5,Math.min(8,width/55)):Math.max(13,Math.sqrt(width*height/24000));lineHeight=Math.round(fontSize*1.32);
   context!.font=font(400);columnWidth=context!.measureText('M').width;columns=Math.ceil(width/columnWidth);rows=Math.ceil(height/lineHeight);
   const mobile=!centered&&width<=900;
   const available=width*(centered?.90:mobile?.91:.49);
   context!.font=font(800,100);const widthPerSize=.84+context!.measureText('Orbit').width/100;
   const size=Math.min(300,width*(width<700?.23:.19),available/widthPerSize),total=size*widthPerSize;
   const left=centered||mobile?(width-total)/2:width*.75-total/2;
   const cy=centered?height*.42:mobile?Math.min(150,height*.30):height*.42;
   orbit=makeMask('orbit',size,left,total,cy);studio=makeMask('studio',size,left,total,cy);
   union={left:Math.min(orbit.box.left,studio.box.left),top:Math.min(orbit.box.top,studio.box.top),right:Math.max(orbit.box.right,studio.box.right),bottom:Math.max(orbit.box.bottom,studio.box.bottom)};
   cells=[];
   for(let index=0;index<columns*rows;index++)if(orbit.set[index]||studio.set[index]){
    const x=index%columns,y=Math.floor(index/columns);cells.push({index,x,y,rowPosition:(y-union.top)/Math.max(1,union.bottom-union.top)});
   }
   element!.dataset.titleBounds=JSON.stringify({x:union.left*columnWidth,y:union.top*lineHeight,width:(union.right-union.left+1)*columnWidth,height:(union.bottom-union.top+1)*lineHeight});
   palette();draw(performance.now());
  }
  const themeObserver=new MutationObserver(refresh);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const observer=new ResizeObserver(resize);observer.observe(element);
  const intersection=new IntersectionObserver(entries=>{
   onScreen=entries[0]?.isIntersecting??false;cancelAnimationFrame(frame);frame=0;lastTick=0;lastPaint=0;
   if(onScreen)refresh();else element.dataset.motion=frozen()?'paused':'suspended';
  },{threshold:0});intersection.observe(element);
  const visibility=()=>{cancelAnimationFrame(frame);frame=0;lastTick=0;lastPaint=0;if(!document.hidden&&onScreen)refresh();else element.dataset.motion=frozen()?'paused':'suspended';};
  window.addEventListener('orbit-appearance',refresh);reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',visibility);
  void document.fonts.ready.then(()=>{if(!disposed)resize();});resize();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();themeObserver.disconnect();window.removeEventListener('orbit-appearance',refresh);reduced.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',visibility);};
 },[paused,centered]);
 return <div className={`orbit-artwork ${centered?'orbit-artwork-centered':''}`} data-paused={paused}><canvas className="orbit-field" ref={canvas} aria-hidden="true"/></div>;
}
