"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
const key = "orbit-appearance-v1";
type Theme = "light" | "dark" | "system";
type Appearance = {theme:Theme;resolved:"light"|"dark";motion:boolean;reduced:boolean;reduceMotion:boolean};
function read():Appearance {
  let theme:Theme="system",reduceMotion=false;
  try{const saved=JSON.parse(localStorage.getItem(key)??"null");if(["light","dark","system"].includes(saved?.theme))theme=saved.theme;reduceMotion=saved?.reduceMotion===true;}catch{}
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {theme,resolved:theme==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme,motion:!reduced&&!reduceMotion,reduced,reduceMotion};
}
function change(update:Partial<Pick<Appearance,"theme"|"reduceMotion">>) {
  const previous=read(),next={theme:previous.theme,reduceMotion:previous.reduceMotion,...update};
  try {localStorage.setItem(key,JSON.stringify(next));}catch {return;}
  window.dispatchEvent(new Event("orbit-appearance"));
}
export function useAppearance() {
  const [appearance,setAppearance]=useState<Appearance>({theme:"system",resolved:"light",motion:true,reduced:false,reduceMotion:false});
  useEffect(()=>{
    const sync=()=>{const next=read();document.documentElement.dataset.theme=next.resolved;document.documentElement.dataset.motion=next.motion?"on":"paused";setAppearance(next);};
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)"),dark=window.matchMedia("(prefers-color-scheme: dark)");
    const storage=(event:StorageEvent)=>{if(event.key===key||event.key===null)sync();};
    sync();window.addEventListener("orbit-appearance",sync);window.addEventListener("storage",storage);reduced.addEventListener("change",sync);dark.addEventListener("change",sync);
    return()=>{window.removeEventListener("orbit-appearance",sync);window.removeEventListener("storage",storage);reduced.removeEventListener("change",sync);dark.removeEventListener("change",sync);};
  },[]);
  return {...appearance,setTheme:(theme:Theme)=>change({theme}),setReduceMotion:(reduceMotion:boolean)=>change({reduceMotion}),toggleTheme:()=>change({theme:read().resolved==="dark"?"light":"dark"})};
}
const modes=[{id:"light",label:"Light",icon:Sun},{id:"dark",label:"Dark",icon:Moon},{id:"system",label:"System",icon:Monitor}] as const;
export function AppearanceToggle() {
  const {theme,setTheme}=useAppearance();
  return <div className="appearance-toggle theme-segment" role="group" aria-label="Colour mode">{modes.map(({id,label,icon:Icon})=><button type="button" key={id} aria-label={`${label} mode`} aria-pressed={theme===id} title={`${label} mode`} onClick={()=>setTheme(id)}><Icon size={17}/><span>{label}</span></button>)}</div>;
}
export function AppearanceSettings() {
  const {theme,setTheme,reduceMotion,setReduceMotion,reduced}=useAppearance();
  return <section className="surface appearance-settings"><h2>Appearance & accessibility</h2><p>Choose how Orbit looks on this device.</p><fieldset><legend>Colour mode</legend><div className="appearance-options">{modes.map(({id,label,icon:Icon})=><button key={id} type="button" aria-pressed={theme===id} onClick={()=>setTheme(id)}><Icon size={18}/><span>{label}</span></button>)}</div></fieldset><label className="preference-check"><input type="checkbox" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)}/>Reduce decorative animation</label><p className="revision-label">{reduced?"Your device also requests reduced motion. This is always respected.":"System mode follows your device, including changes while Orbit is open."}</p></section>;
}
