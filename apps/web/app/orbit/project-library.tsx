"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, FolderPlus, Image, Film, Music2, Upload, Trash2, Folder } from "lucide-react";
import { OrbitMark } from "./orbit-mark";
import { AppearanceToggle } from "./appearance";
import { createProject, deleteProject, importProjectFile, listProjects, projectSource } from "./project-store";
import type { AssetKind, MediaProject, ProjectAsset } from "./project-document";
import "./project-motion.css";
import "./project-library.css";

const filters=["all","image","video","audio"] as const;
const labels={all:"All media",image:"Images",video:"Videos",audio:"Audio"};
const icons={image:Image,video:Film,audio:Music2};
function MediaTabs({value,onChange}:{value:typeof filters[number];onChange:(value:typeof filters[number])=>void}) {
  const bar=useRef<HTMLDivElement>(null),pill=useRef<HTMLSpanElement>(null),initial=useRef(true);
  useLayoutEffect(()=>{
    const root=bar.current,indicator=pill.current;if(!root||!indicator)return;
    const measure=(snap:boolean)=>{const tab=root.querySelector<HTMLButtonElement>('[aria-selected="true"]');if(!tab)return;if(snap)indicator.style.transition="none";indicator.style.width=`${tab.offsetWidth}px`;indicator.style.transform=`translateX(${tab.offsetLeft}px)`;if(snap){void indicator.offsetWidth;indicator.style.transition="";}};
    measure(initial.current);initial.current=false;
    const observer=new ResizeObserver(()=>measure(true));observer.observe(root);return()=>observer.disconnect();
  },[value]);
  return <div ref={bar} className="t-tabs" role="tablist" aria-label="Media type"><span ref={pill} className="t-tabs-pill" aria-hidden="true"/>{filters.map((filter,index)=><button key={filter} type="button" role="tab" className="t-tab" id={`project-tab-${filter}`} aria-controls="project-assets" aria-selected={value===filter} tabIndex={value===filter?0:-1} onClick={()=>onChange(filter)} onKeyDown={event=>{let next=index;if(event.key==="ArrowRight")next=(index+1)%filters.length;else if(event.key==="ArrowLeft")next=(index+filters.length-1)%filters.length;else if(event.key==="Home")next=0;else if(event.key==="End")next=filters.length-1;else return;event.preventDefault();onChange(filters[next]);bar.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus();}}>{labels[filter]}</button>)}</div>;
}
function AssetPreview({project,asset}:{project:MediaProject;asset:ProjectAsset}) {
  const [url,setUrl]=useState(""),[error,setError]=useState("");
  useEffect(()=>{let active=true,objectUrl="";setUrl("");setError("");void projectSource(project.id,asset.id).then(file=>{if(active){objectUrl=URL.createObjectURL(file);setUrl(objectUrl);}}).catch(()=>{if(active)setError("This source is no longer available on this device.");});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[project.id,asset.id]);
  if(error)return <p role="status">{error}</p>;
  if(!url)return <p>Opening source…</p>;
  return asset.kind==="image"?<img src={url} alt={asset.name}/>:asset.kind==="video"?<video src={url} controls playsInline preload="metadata"/>:<audio src={url} controls preload="metadata"/>;
}
export function ProjectLibrary({preview=false}:{preview?:boolean}) {
  const home=preview?"/preview":"/",editor=preview?"/preview/editor":"/editor";
  const [projects,setProjects]=useState<MediaProject[]>([]),[selected,setSelected]=useState("");
  const [title,setTitle]=useState(""),[filter,setFilter]=useState<typeof filters[number]>("all"),[query,setQuery]=useState("");
  const [assetId,setAssetId]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[ready,setReady]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const project=projects.find(item=>item.id===selected),asset=project?.assets.find(item=>item.id===assetId);
  async function refresh(){const next=await listProjects();setProjects(next);return next;}
  useEffect(()=>{let active=true;void listProjects().then(next=>{if(active)setProjects(next);}).catch(()=>{if(active)setNotice("Device storage is unavailable. Your existing server drafts are unaffected.");}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
  async function action(task:()=>Promise<void>){if(busy)return;setBusy(true);setNotice("");try{await task();}catch(error){setNotice(error instanceof Error?error.message:"The project could not be saved.");await refresh().catch(()=>{});}finally{setBusy(false);}}
  const visible=project?.assets.filter(item=>(filter==="all"||item.kind===filter)&&item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))??[];
  return <main className="project-library">
    <header className="project-header"><a className="brand-word" href={home} aria-label="Orbit home"><OrbitMark small/><span>orbit<span className="word-dot">.</span></span></a><span className="project-device-badge">Device library</span><AppearanceToggle/></header>
    <section className="project-intro"><a href={`${home}?view=studio`} className="project-back"><ArrowLeft size={16}/>Back to Studio</a><p className="eyebrow">YOUR CREATIVE WORKSPACE</p><h1>A place for<br/><em>your next idea.</em></h1><p>Bring your images, video and sound together. Open a source in the editor when you are ready.</p></section>
    <div className="project-workspace"><aside className="project-sidebar"><div className="project-section-label"><Folder size={18}/><h2>Projects</h2><span>{projects.length}</span></div>
      <form onSubmit={event=>{event.preventDefault();void action(async()=>{const next=await createProject(title);await refresh();setSelected(next.id);setAssetId("");setTitle("");setNotice("Project saved on this device.");});}}><label htmlFor="project-title">New project name</label><input id="project-title" maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="My next campaign" disabled={busy||!ready}/><button type="submit" className="orbit-button orbit-button-default" disabled={busy||!ready||!title.trim()}><FolderPlus size={17}/>Create project</button></form>
      <div className="project-list">{projects.map(item=><button type="button" className="project-card" key={item.id} aria-pressed={selected===item.id} disabled={busy} onClick={()=>{setSelected(item.id);setAssetId("");setQuery("");}}><span className="project-card-icon"><Folder size={20}/></span><span><strong>{item.title}</strong><small>{item.assets.length} source files · revision {item.revision}</small></span><ArrowUpRight size={17}/></button>)}</div>
      <p className="project-storage-note">Original files stay in this browser. Clearing site data removes this library. Editor changes are exported separately.</p>
    </aside><section className="project-main" aria-label="Project media">
      {project?<><div className="project-main-heading"><div><p className="eyebrow">SOURCE MEDIA</p><h2>{project.title}</h2></div><button className="orbit-button orbit-button-default" disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>Import media</button><input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)void action(async()=>{const next=await importProjectFile(project.id,project.revision,file);await refresh();setNotice(next.revision===project.revision?"This original is already in the project.":"Original saved on this device. No file was uploaded.");});}}/></div>
      <div className="project-filters"><MediaTabs value={filter} onChange={setFilter}/><label><span className="sr-only">Find source media</span><input type="search" placeholder="Find a file…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Find source media"/></label></div>
      <div id="project-assets" role="tabpanel" aria-labelledby={`project-tab-${filter}`} tabIndex={0} className="project-assets">{visible.length?visible.map(item=>{const Icon=icons[item.kind];return <article key={item.id} className="source-card"><button className="source-preview-button" aria-label={`Preview ${item.name}`} onClick={()=>setAssetId(item.id)}><Icon size={36}/><span>{item.kind}</span></button><h3 title={item.name}>{item.name}</h3><p>{(item.bytes/1024/1024).toFixed(2)} MB · Original</p>{item.kind!=="audio"?<a className="project-editor-link" href={`${editor}/${item.kind}?project=${project.id}&asset=${item.id}`}>Open {item.kind} editor<ArrowUpRight size={15}/></a>:<button className="project-editor-link" onClick={()=>setAssetId(item.id)}>Listen<Music2 size={15}/></button>}</article>;}):<div className="project-empty"><Upload size={32}/><h3>{project.assets.length?"No matching files":"Start with your own media"}</h3><p>{project.assets.length?"Try another filter or file name.":"Import an image, video or audio file. Your original is kept unchanged."}</p></div>}</div>
      {asset?<section className="project-preview t-panel-slide" data-open="true" aria-label="Source preview"><div><h3>{asset.name}</h3><button className="text-action" onClick={()=>setAssetId("")}>Close preview</button></div><AssetPreview key={asset.id} project={project} asset={asset}/></section>:null}
      <div className="project-footer"><span>Saved on this device · {project.assets.length}/100 files</span><button className="text-action" disabled={busy} onClick={()=>{if(window.confirm(`Delete “${project.title}” and its source files from this device?`))void action(async()=>{await deleteProject(project);await refresh();setSelected("");setAssetId("");setNotice("Device project deleted.");});}}><Trash2 size={15}/>Delete project</button></div>
      </>:<div className="project-welcome"><div className="project-welcome-art"><OrbitMark/></div><h2>Make room for something good.</h2><p>Create a project or open one from your library.</p><div className="project-kind-cards">{(["image","video","audio"] as AssetKind[]).map(kind=>{const Icon=icons[kind];return <div key={kind}><Icon size={24}/><strong>{labels[kind]}</strong><span>Your originals. One project.</span></div>;})}</div></div>}
    </section></div><p role="status" className="project-notice">{notice}</p>
  </main>;
}
