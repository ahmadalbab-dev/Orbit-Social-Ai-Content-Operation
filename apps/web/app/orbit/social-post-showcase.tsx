"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Check, ImageIcon } from "lucide-react";
import { PlatformIcon, type OrbitChannel } from "./design-ui";
import { Button } from "./ui";
import "./social-post-showcase.css";
const examples = [
 {id:"facebook",name:"Facebook",caption:"A little room for your next big idea.\n\nThoughtful details. A fresh perspective. Something worth sharing with your community.",approach:"A welcoming introduction, with room to tell the story behind your image.",media:"Landscape image, with the caption above it.",format:"Landscape image post"},
 {id:"instagram",name:"Instagram",caption:"Small details. Fresh possibilities.\nMake room for your next idea.\n\n#CreativeSpace #MadeWithCare",approach:"A short visual story, followed by a few relevant hashtags.",media:"Square image first, with the caption underneath.",format:"Square image post"},
 {id:"threads",name:"Threads",caption:"Sometimes a fresh idea starts with a little breathing room.\n\nWhat are you making space for today?",approach:"A conversational thought and a question that invites a reply.",media:"Text first, with a supporting image below.",format:"Text + image post"},
] as const;
export function SocialPostShowcase({brandName,onCreate}:{brandName:string;onCreate:()=>void}) {
 const [platform,setPlatform]=useState<OrbitChannel>("facebook");
 const identity=useId(),tabs=useRef<Array<HTMLButtonElement|null>>([]);
 const selected=examples.find(example=>example.id===platform)!;
 const panelId=`${identity}-post`;
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  let next:number;
  if(event.key==="ArrowRight")next=(index+1)%examples.length;
  else if(event.key==="ArrowLeft")next=(index+examples.length-1)%examples.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=examples.length-1;
  else return;
  event.preventDefault();setPlatform(examples[next].id);tabs.current[next]?.focus();
 }
 const image=<img className="home-post-photo" src="/media/orbit-creative-still.webp" width={1672} height={941} alt="A cream ceramic jug and bowl beside folded violet fabric in soft sunlight" loading="lazy"/>;
 return <section className="home-post-showcase" aria-labelledby={`${identity}-heading`}>
  <div className="home-post-story"><span className="home-post-eyebrow">A LOOK BEFORE YOU SHARE</span><h2 id={`${identity}-heading`}>One idea.<br/><em>Every channel.</em></h2><p>See how a caption and image can feel at home on each platform. Choose a channel to explore the example.</p>
   <div className="home-post-tabs" role="tablist" aria-label="Example post platforms">{examples.map((example,index)=><button key={example.id} ref={element=>{tabs.current[index]=element;}} type="button" role="tab" id={`${identity}-${example.id}`} aria-selected={platform===example.id} aria-controls={panelId} tabIndex={platform===example.id?0:-1} onClick={()=>setPlatform(example.id)} onKeyDown={event=>navigate(event,index)}><PlatformIcon platform={example.id} size={19}/><span>{example.name}</span></button>)}</div>
   <div className="home-post-explanation" aria-live="polite"><dl><div><dt>Caption</dt><dd>{selected.approach}</dd></div><div><dt>Media</dt><dd>{selected.media}</dd></div></dl></div>
   <p className="home-post-review"><Check size={16} strokeWidth={1.5} aria-hidden="true"/>Review your caption and media before approving a draft.</p>
   <Button className="home-post-create" variant="outline" onClick={onCreate}>Create your own post<span><ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true"/></span></Button>
  </div>
  <div className="home-post-stage" role="tabpanel" id={panelId} aria-labelledby={`${identity}-${platform}`} tabIndex={0}>
   <div className="home-post-stage-label"><span className="home-post-example-label">EXAMPLE PREVIEW</span><span>{selected.name}</span></div>
   <article className="home-post-example" data-platform={platform} aria-label={`${selected.name} example post`}><header className="home-post-account"><span className="home-post-avatar" aria-hidden="true">{brandName.slice(0,1).toUpperCase()}</span><div><strong>{brandName}</strong><span>Example post · not published</span></div><PlatformIcon platform={platform} size={24}/></header>{platform==="instagram"?image:null}<p className="home-post-caption">{selected.caption}</p>{platform!=="instagram"?image:null}<footer className="home-post-format"><ImageIcon size={15} strokeWidth={1.5} aria-hidden="true"/>{selected.format}<span>Illustrative layout</span></footer></article>
   <p className="home-post-disclosure">Example content and layouts. Live publishing is off.</p>
  </div>
 </section>;
}
