"use client";

import * as React from "react";
import {Home,PenLine,CalendarDays,Film,Link2,Settings,type LucideIcon} from "lucide-react";
import {cn} from "../../app/orbit/ui";

export type DockItem={id:string;label:string;accessible?:string;icon:LucideIcon;badge?:string};
export type DockProps=Omit<React.HTMLAttributes<HTMLElement>,"onSelect"> & {
 items:readonly DockItem[];
 activeId?:string;
 onSelect:(id:string)=>void;
};

/** Adapted from the user-supplied 21st.dev Dali Agents dock. */
export function Dock({items,activeId,onSelect,className,...props}:DockProps){
 return <nav {...props} className={cn("reference-dock",className)} aria-label={props["aria-label"]??"Navigation"}>
  {items.map(item=><DockIcon key={item.id} item={item} active={activeId===item.id} onClick={()=>onSelect(item.id)}/>)}
 </nav>;
}
function DockIcon({item,active,onClick}:{item:DockItem;active:boolean;onClick:()=>void}){
 const Icon=item.icon;
 return <button type="button" className="reference-dock-icon group relative grid place-items-center rounded-xl transition-transform duration-200" aria-label={item.accessible??item.label} aria-current={active?"page":undefined} onClick={onClick}>
  <Icon className="reference-dock-svg" size={21} strokeWidth={2.1} aria-hidden="true"/>
  {item.badge?<span className="reference-dock-badge" aria-hidden="true">{item.badge}</span>:null}
  <span className="reference-dock-tooltip" aria-hidden="true">{item.label}</span>
 </button>;
}
const demoItems:readonly DockItem[]=[
 {id:"home",label:"Home",icon:Home},{id:"studio",label:"Studio",icon:PenLine},
 {id:"media",label:"Media",icon:Film},{id:"calendar",label:"Calendar",icon:CalendarDays},
 {id:"channels",label:"Channels",icon:Link2},{id:"settings",label:"Settings",icon:Settings},
];
/** Standalone demo. Production uses Dock in the existing Orbit navigation shell. */
export default function HeroDock(){
 const [active,setActive]=React.useState("home");
 return <section className="dock-demo relative isolate min-h-screen w-full overflow-hidden px-4 sm:px-8">
  <div className="dock-demo-glow pointer-events-none absolute inset-0" aria-hidden="true"/>
  <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 text-center">
   <h1 className="text-balance font-semibold tracking-tight text-3xl sm:text-4xl">The Orbit workspace</h1>
   <p className="max-w-xl text-sm">Create. Edit. Review. Plan. One dock for every surface.</p>
   <Dock items={demoItems} activeId={active} onSelect={setActive}/>
   <p className="text-xs" role="status">{demoItems.find(item=>item.id===active)?.label} selected</p>
  </div>
 </section>;
}
