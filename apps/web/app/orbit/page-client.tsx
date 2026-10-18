"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, Eye, FilePenLine, Film, Hash, House, Info, LayoutDashboard, Link2, LockKeyhole, MoreHorizontal, PenLine, Play, RefreshCw, Save, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card } from "./ui";
import { Dock } from "../../components/ui/dock";
import { DatePicker } from "../../components/ui/date-picker";
import { EmptyState, IconButton, OrbitMark, PlatformBadge, PlatformIcon, SectionHeading, StatusBadge, ToolLink } from "./design-ui";
import { AppearanceToggle, useAppearance } from "./appearance";
import { OrbitField } from "./orbit-field";
import { WorkflowShowcase } from "./workflow-showcase";
import { AiSetup } from "./ai-setup";
import {AI_MODES,type AiMode} from "./ai-modes";
import { ImageEditor } from "./image-editor";
import { VideoEditor } from "./video-editor";
import { BillingPanel } from "./billing-panel";
import { monthGrid } from "./calendar-data";
import {dateKeyInZone,scheduledInstant} from "./device-preferences";
import {useDevicePreferences} from "./use-device-preferences";
import {WorkspaceSettings} from "./workspace-settings";
import "./workspace-settings.css";
import "./workspace-navigation.css";
import {ConnectionsPanel,type IntegrationStatus} from "./connections-panel";

const channels = ["facebook", "instagram", "threads"] as const;
type Variant = { platform: string; copy: string; hashtags: string[]; callToAction: string };
type Content = { id: string; topic: string; status: string; revision: number; source?: string; variants: Variant[]; scheduledFor?: string; approvedRevision?: number };
import {brandPayload,profileFromBrand,type Profile,type StoredBrand} from "./brand-profile";
type View = "overview" | "studio" | "video" | "calendar" | "connections" | "settings" | "profile";
const initialProfile: Profile = {name:"My brand",voice:"Warm, clear and practical",audience:"Creators and businesses",topics:"",language:"Bahasa Melayu"};
const navigation = [{ id: "overview", label: "Home", accessible: "Overview", icon: House }, { id: "studio", label: "Studio", accessible: "Content Studio", icon: PenLine }, { id: "video", label: "Media", accessible: "Video Editor", icon: Film }, { id: "calendar", label: "Calendar", accessible: "Calendar", icon: CalendarDays }, { id: "connections", label: "Channels", accessible: "Connections", icon: Link2 }, { id: "settings", label: "Settings", accessible: "Workspace Settings", icon: Settings }] as const;
import {api} from "./session-api";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export default function Home({workspaceId,workspaceName="Preview workspace",workspaceControls,preview=false}:{workspaceId:string;workspaceName?:string;workspaceControls?:ReactNode;preview?:boolean}) {
  const [view, setView] = useState<View>("overview");
  const [floating,setFloating]=useState(false);
  const headerRef=useRef<HTMLElement>(null);
  useEffect(()=>{const header=headerRef.current;if(!header)return;const observer=new IntersectionObserver(([entry])=>setFloating(!entry.isIntersecting),{threshold:0});observer.observe(header);return()=>observer.disconnect();},[]);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [items, setItems] = useState<Content[]>([]);
  const [connection, setConnection] = useState<IntegrationStatus | null>(null);
  const [notice, setNotice] = useState("");
  const {motion}=useAppearance();
  const paused=!motion;
  const [openedDraft,setOpenedDraft] = useState<{id:string;request:number} | null>(null);
  const refresh = useCallback(async () => {
    if(preview)return;
    try { setItems(await api<Content[]>("/content")); setNotice(""); }
    catch (error) { setNotice(`Workspace: ${errorMessage(error)}`); }
  }, [preview]);
  useEffect(() => {
    if(preview)return;
    api<StoredBrand[]>("/brands").then(brands=>{if(brands[0])setProfile(profileFromBrand(brands[0]));}).catch(()=>{});
    void refresh();
    api<IntegrationStatus>("/integrations/status").then(setConnection).catch(() => setConnection(null));
  }, [refresh,preview]);
  const go = (next:View) => { setView(next); window.scrollTo({top:0,behavior:"instant"}); };
  const openDraft = (id:string) => { setOpenedDraft({id,request:Date.now()}); go("studio"); };
  const saveProfile = async (next: Profile) => { const stored=await api<StoredBrand>(next.id?`/brands/${next.id}`:"/brands",next.id?"PUT":"POST",brandPayload(next)); setProfile(profileFromBrand(stored)); };
  const scheduledCount=items.filter(post=>post.status==="SCHEDULED").length;
  return <main className={`orbit-shell ${paused?"motion-paused":""}`}>
    <header className="app-header workspace-header" ref={headerRef}>
      <button className="brand-word workspace-brand" onClick={()=>go("overview")} aria-label="Orbit home"><OrbitMark small/><span className="workspace-brand-copy"><span>orbit<span className="word-dot">.</span></span><small className="current-workspace-name" title={workspaceName}>{workspaceName}</small></span></button>
      <div className="workspace-nav-slot"><div className="workspace-navigation" data-floating={floating}><Dock id="orbit-workspace-nav" className="orbit-nav" aria-label="Workspace" items={navigation.map(item=>({...item,badge:item.id==="calendar"&&scheduledCount?(scheduledCount>99?"99+":String(scheduledCount)):undefined}))} activeId={view} onSelect={id=>go(id as View)}/></div></div>
      <div className="workspace-header-actions"><AppearanceToggle/><button className="profile-button" onClick={()=>go("profile")} aria-label="Open profile" aria-current={view==="profile"?"page":undefined} title={profile.name}>{profile.name.slice(0,1).toUpperCase()}</button></div>
    </header>
    <div className="app-content">{notice?<div role="alert" className="alert-message">{notice}<IconButton label="Refresh workspace" onClick={refresh}><RefreshCw size={17}/></IconButton></div>:null}
      <details className="preview-note"><summary><LockKeyhole size={13}/>{preview?"v1 design preview · local tools only":"Private workspace · live posting off"}<Info size={13}/></summary><p>{preview?"Try navigation, Light/Dark mode, image editing and local video previews. AI generation, saved drafts, account connections, server renders and payments require a configured backend and sign-in. Files selected here stay on this device unless you explicitly upload from an authenticated workspace.":"Drafts and brand profiles use the configured backend. Image edits and video previews stay on this device. Video uploads happen only when you choose Upload to workspace; configured workers produce downloadable MP4 files. Live publishing is off."}</p></details>
      <div hidden={view!=="overview"}><Overview profile={profile} items={items} go={go} openDraft={openDraft} paused={paused||view!=="overview"}/></div>
      <div hidden={view!=="studio"}><ContentStudio preview={preview} profile={profile} items={items} onRefresh={refresh} openedDraft={openedDraft}/></div>
      {view==="video"?<MediaEditors preview={preview}/>:null}
      <div hidden={view!=="calendar"}><Calendar items={items} refresh={refresh} openDraft={openDraft}/></div>
      <div hidden={view!=="connections"}><ConnectionsPanel status={connection} preview={preview}/></div>
      <div hidden={view!=="profile"}><BrandProfile preview={preview} profile={profile} save={saveProfile}/></div>
      <div hidden={view!=="settings"}><WorkspaceSettings preview={preview} workspaceControls={workspaceControls}/></div>
      <footer className="orbit-footer"><span className="footer-mark">orbit<span className="word-dot">.</span></span><span>Make room for better content.</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/data-deletion">Your data</a></div></footer>
    </div>
  </main>;
}
function Overview({profile,items,go,openDraft,paused}:{profile:Profile;items:Content[];go:(view:View)=>void;openDraft:(id:string)=>void;paused:boolean}) {
  const stats=[{label:"Drafts",value:items.filter(i=>i.status==="DRAFT").length,icon:FilePenLine,tone:"lavender"},{label:"Approved",value:items.filter(i=>i.status==="APPROVED").length,icon:ShieldCheck,tone:"mint"},{label:"Scheduled",value:items.filter(i=>i.status==="SCHEDULED").length,icon:Clock3,tone:"peach"}];
  return <section className="overview-view">
    <div className="orbit-hero"><OrbitField paused={paused}/><div className="hero-intro"><p className="eyebrow"><span className="live-dot"/>SOCIAL MEDIA AUTOMATION</p><h1>More ideas.<br/><em>Less busywork.</em></h1><p className="hero-caption">Your content. Every channel.<br/>One calm workspace.</p><div className="hero-actions"><Button onClick={()=>go("studio")} className="hero-primary"><PenLine size={18} aria-hidden="true"/>Create post<ArrowUpRight size={18} aria-hidden="true"/></Button><button className="text-action" onClick={()=>go("video")}><Film size={18} aria-hidden="true"/>Edit video<ArrowRight size={17} aria-hidden="true"/></button></div><div className="hero-platforms">{channels.map(p=><PlatformBadge key={p} platform={p}/>)}<span>{profile.name}</span></div></div></div>
      <aside className="home-launchpad" aria-label="Quick actions"><div className="launchpad-heading"><span className="eyebrow">YOUR NEXT MOVE</span><OrbitMark small/></div><h2>What are we making?</h2><p>Start with an idea. Make it yours.</p><div className="launchpad-actions">{[{title:"Write a post",detail:"Ideas, captions + channel previews",icon:PenLine,view:"studio"},{title:"Edit your media",detail:"Images, video + the News report style",icon:Film,view:"video"},{title:"Plan your week",detail:"Calendar + approved drafts",icon:CalendarDays,view:"calendar"}].map(({title,detail,icon:Icon,view})=><button key={view} onClick={()=>go(view as View)}><span className="launchpad-icon"><Icon size={22} aria-hidden="true"/></span><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={18} aria-hidden="true"/></button>)}</div><div className="launchpad-note"><ShieldCheck size={15} aria-hidden="true"/>You review. You decide when to share.</div></aside>
    <div className="numbered-section"><div className="section-index"><span>01</span>Workspace</div><div className="workspace-stats">{stats.map(({label,value,icon:Icon,tone})=><button key={label} className={`stat-block ${tone}`} onClick={()=>go(label==="Scheduled"?"calendar":"studio")}><Icon size={21} aria-hidden="true"/><strong>{value.toString().padStart(2,"0")}</strong><span>{label}</span><ArrowUpRight size={17} aria-hidden="true"/></button>)}</div></div>
    <div className="numbered-section"><div className="section-index"><span>02</span>Create</div><div className="tool-grid"><ToolLink icon={<Sparkles size={28}/>} title="Content studio" onClick={()=>go("studio")}/><ToolLink icon={<Film size={28}/>} title="Image + video" onClick={()=>go("video")} tone="lavender"/><ToolLink icon={<CalendarDays size={28}/>} title="Your calendar" onClick={()=>go("calendar")} tone="peach"/></div></div>
    <div className="numbered-section"><div className="section-index"><span>03</span>Workflow</div><div className="workflow-list">{[{icon:PenLine,title:"Create",detail:"Words + image + video"},{icon:ShieldCheck,title:"Review",detail:"Your approval"},{icon:CalendarDays,title:"Schedule",detail:"Recorded plans"}].map(({icon:Icon,title,detail},i)=><button key={title} onClick={()=>go(i===2?"calendar":"studio")}><span className="workflow-number">0{i+1}</span><Icon size={23} aria-hidden="true"/><strong>{title}</strong><span>{detail}</span><ArrowUpRight size={19} aria-hidden="true"/></button>)}</div></div>
    <WorkflowShowcase go={go}/><div className="numbered-section"><div className="section-index"><span>05</span>Queue</div><div>{items.length?<div className="queue-list">{items.slice(0,4).map(item=><button key={item.id} onClick={()=>openDraft(item.id)}><div className="queue-platforms">{item.variants.map(v=><PlatformBadge key={v.platform} platform={v.platform}/>)}</div><span>{item.variants[0]?.copy||item.topic}</span><StatusBadge status={item.status}/><ArrowUpRight size={18} aria-hidden="true"/></button>)}</div>:<EmptyState icon={<FilePenLine size={26}/>} title="Your next post starts here." action={<button className="text-action" onClick={()=>go("studio")}>Create a draft<ArrowRight size={17} aria-hidden="true"/></button>}/>}</div></div>
  </section>;
}

function ContentStudio({profile,items,onRefresh,openedDraft,preview=false}:{preview?:boolean;profile:Profile;items:Content[];onRefresh:()=>Promise<void>;openedDraft:{id:string;request:number}|null}) {
  const {preferences}=useDevicePreferences();
  const [aiReady,setAiReady]=useState(false);
  const [aiMode,setAiMode]=useState<AiMode>("caption");
  const [generating,setGenerating]=useState(false);
  const brandCache=useRef<{key:string;id:string}|null>(null);
  const [topic,setTopic]=useState("Kongsi peluang mencari kerja dan ajak orang berbual tentang kawasan kerja pilihan mereka.");
  const [selected,setSelected]=useState<string[]>([...channels]);
  const [item,setItem]=useState<Content|null>(null);
  const [variants,setVariants]=useState<Variant[]>([]);
  const [active,setActive]=useState("facebook");
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [time,setTime]=useState("");
  const lastOpened=useRef<number|null>(null);
  useEffect(()=>{
    if(!openedDraft||lastOpened.current===openedDraft.request)return;
    const saved=items.find(r=>r.id===openedDraft.id);if(!saved)return;
    lastOpened.current=openedDraft.request;
    if(busy){setNotice("Finish the current action before opening another draft.");return;}
    if(item?.id===saved.id)return;
    if(dirty&&!window.confirm("Discard unsaved changes and open another draft?"))return;
    setItem(saved);setVariants(saved.variants);setActive(saved.variants[0]?.platform??"facebook");setTime("");setDirty(false);setNotice("Saved draft loaded.");
  },[openedDraft,items,busy,dirty,item?.id]);
  async function action(task:()=>Promise<void>) {setBusy(true);try{await task();await onRefresh();}catch(error){setNotice(errorMessage(error));}finally{setBusy(false);}}
  function accept(next:Content){setItem(next);setVariants(next.variants);setDirty(false);setActive(old=>next.variants.some(v=>v.platform===old)?old:next.variants[0]?.platform??"facebook");}
  async function save():Promise<Content>{if(!item)throw new Error("Create a draft first.");const next=await api<Content>(`/content/${item.id}/review`,"PUT",{variants,expectedRevision:item.revision});accept(next);return next;}
  const generate=async()=>{setGenerating(true);try{await action(async()=>{
    const key=JSON.stringify(brandPayload(profile));
    const brand=profile.id?{id:profile.id}:brandCache.current?.key===key?brandCache.current:await api<{id:string}>("/brands","POST",brandPayload(profile));brandCache.current={key,id:brand.id};
    if(!aiReady)throw new Error("AI is not configured by the workspace operator yet.");
    if(dirty&&!window.confirm("Replace your unsaved draft with a new AI draft?"))return;
    const next=await api<Content>("/content/generate","POST",{brandId:brand.id,topic,platforms:selected,mode:aiMode,language:profile.language});
    accept(next);setTime("");setNotice("AI draft ready for review.");
  });}finally{setGenerating(false);}};
  const manual=()=>action(async()=>{if(dirty&&!window.confirm("Replace your unsaved draft?"))return;const brand=profile.id?{id:profile.id}:await api<{id:string}>("/brands","POST",brandPayload(profile));accept(await api<Content>("/content/manual","POST",{brandId:brand.id,topic,platforms:selected}));setNotice("Manual draft ready. Write and review before approval.");});
  const approve=()=>action(async()=>{if(!item)return;const draft=dirty?await save():item;accept(await api<Content>(`/content/${draft.id}/approve`,"POST",{expectedRevision:draft.revision}));setNotice("Approved revision. Ready to record a schedule.");});
  const schedule=()=>action(async()=>{if(!item||!time)throw new Error("Choose a date and time first.");accept(await api<Content>(`/content/${item.id}/schedule`,"POST",{scheduledFor:scheduledInstant(time,preferences.timeZone),expectedRevision:item.revision}));setNotice("Schedule recorded. No background publishing worker is active.");});
  const simulate=()=>action(async()=>{if(!item)return;accept(await api<Content>(`/content/${item.id}/publish`,"POST",{expectedRevision:item.revision}));setNotice("Simulation complete. Nothing was posted to social media.");});
  const approved=!!item&&!dirty&&["APPROVED","SCHEDULED"].includes(item.status);
  const variant=variants.find(v=>v.platform===active)??variants[0];
  const edit=(field:keyof Variant,value:string|string[])=>{if(!variant)return;setVariants(old=>old.map(v=>v.platform===variant.platform?{...v,[field]:value}:v));setDirty(true);setNotice("Unsaved changes. Save and approve again.");};
  return <section className="workspace-view"><SectionHeading number="01" label="Studio" title="Create once. Review every channel."/>
    {preview?<p className="action-notice">Design preview. AI and saved drafts become available after backend setup and sign-in.</p>:<AiSetup onReady={setAiReady}/>}
    <div className="studio-toolbar"><span className="mini-profile"><OrbitMark small/>{profile.name}</span><label className="draft-select"><span className="sr-only">Open saved draft</span><select aria-label="Open saved draft" value={item?.id??""} disabled={busy} onChange={e=>{if(dirty&&!window.confirm("Discard unsaved changes and open another draft?"))return;const saved=items.find(r=>r.id===e.target.value);if(saved){accept(saved);setTime("");setNotice("Saved draft loaded.");}}}><option value="">Open a draft</option>{items.map(r=><option key={r.id} value={r.id}>{r.status} · {r.variants[0]?.copy.slice(0,40)}</option>)}</select></label></div>
    <div className="studio-grid"><div className="studio-main"><Card className="surface brief-panel"><div className="panel-label"><Sparkles size={18} aria-hidden="true"/><label htmlFor="topic">Your idea or text</label></div><label className="field ai-task">Create<select aria-label="AI content task" value={aiMode} disabled={busy} onChange={e=>setAiMode(e.target.value as AiMode)}>{Object.entries(AI_MODES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><textarea id="topic" disabled={busy} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What's on your mind?"/><div className="brief-bottom"><fieldset className="channel-picker" disabled={busy}><legend className="sr-only">Choose social channels</legend>{channels.map(p=><button key={p} type="button" aria-label={`Select ${p}`} aria-pressed={selected.includes(p)} className={`channel-choice ${selected.includes(p)?"selected":""}`} onClick={()=>setSelected(old=>old.includes(p)?old.filter(v=>v!==p):[...old,p])}><PlatformIcon platform={p}/><span className="sr-only">{p}</span>{selected.includes(p)?<Check size={11} className="choice-check" aria-hidden="true"/>:null}</button>)}</fieldset><Button variant="outline" disabled={preview||busy||!topic.trim()||!selected.length} onClick={manual}>Start manually</Button><Button disabled={busy||!aiReady||!topic.trim()||!selected.length} onClick={generate} aria-label="Generate AI content"><Sparkles size={16} aria-hidden="true"/>{generating?"Generating…":"Generate with AI"}<ArrowUpRight size={16} aria-hidden="true"/></Button></div></Card>
      {generating?<p role="status" className="action-notice">Writing your drafts with AI. This can take up to 45 seconds.</p>:null}
      {variant?<Card className="surface draft-workbench"><div className="channel-tabs" aria-label="Draft channels">{variants.map(v=><button key={v.platform} aria-pressed={variant.platform===v.platform} onClick={()=>setActive(v.platform)}><PlatformIcon platform={v.platform} size={18}/><span>{v.platform}</span></button>)}</div><div className="editor-preview"><div className="caption-editor"><label>Caption<textarea aria-label={`${variant.platform} copy`} disabled={busy} value={variant.copy} onChange={e=>edit("copy",e.target.value)}/></label><div className="editor-meta"><span>{[...variant.copy].length} characters</span>{dirty?<span>Unsaved</span>:<span>Saved</span>}</div><details className="advanced-fields"><summary><Hash size={16} aria-hidden="true"/>Hashtags + CTA</summary><label><Hash size={14} aria-hidden="true"/>Hashtags<input aria-label={`${variant.platform} hashtags`} disabled={busy} value={variant.hashtags.join(" ")} onChange={e=>edit("hashtags",e.target.value.split(/\s+/).filter(Boolean))}/></label><label><Link2 size={14} aria-hidden="true"/>Call to action<input aria-label={`${variant.platform} call to action`} disabled={busy} value={variant.callToAction} onChange={e=>edit("callToAction",e.target.value)}/></label></details></div><div className="social-preview"><div className="preview-label"><Eye size={14} aria-hidden="true"/>Preview</div><article><div className="social-header"><span className="social-avatar">{profile.name.slice(0,1).toUpperCase()}</span><div><strong>{profile.name}</strong><span>Draft preview</span></div><PlatformIcon platform={variant.platform} size={19}/></div><p>{variant.copy}</p>{variant.callToAction?<p>{variant.callToAction}</p>:null}<p className="preview-hashtags">{variant.hashtags.join(" ")}</p></article></div></div></Card>:<Card className="surface"><EmptyState icon={<PenLine size={26}/>} title="A little idea. A new post."/></Card>}
    </div><aside><Card className="surface review-panel"><div className="panel-label"><ShieldCheck size={19} aria-hidden="true"/><h2>Review</h2>{item?<StatusBadge status={dirty?"DRAFT":item.status}/>:null}</div>{item?<p className="revision-label">Revision {item.revision}{dirty?" · unsaved":""}</p>:null}<p className="review-help">Create a draft, edit its caption, then approve before scheduling.</p><div className="review-actions"><Button variant="outline" disabled={!item||busy||!dirty} onClick={()=>action(async()=>{await save();setNotice("Draft saved. Approval is required again.");})} aria-label="Save draft"><Save size={17} aria-hidden="true"/>Save</Button><Button disabled={!item||busy||(!dirty&&item.status!=="DRAFT")} onClick={approve} aria-label="Approve content"><Check size={17} aria-hidden="true"/>Approve</Button></div><div className="schedule-control"><p className="schedule-date-label"><CalendarDays size={15} aria-hidden="true"/>{preferences.city} · {preferences.timeZone.replaceAll("_"," ")}</p><DatePicker label={`Schedule time ${preferences.city}`} timeZone={preferences.timeZone} timeZoneLabel={preferences.city} withTime disabled={busy} value={time} onChange={setTime}/><Button className="full-button" variant="outline" disabled={!approved||busy||!time} onClick={schedule} aria-label="Record schedule"><CalendarDays size={17} aria-hidden="true"/>Schedule</Button></div><button className="text-action simulation-action" disabled={!approved||busy} onClick={simulate} aria-label="Simulate publishing"><Play size={15} aria-hidden="true"/>Test publishing<ArrowRight size={15} aria-hidden="true"/></button>{notice?<p role="status" className="action-notice">{notice}</p>:null}<details className="small-details"><summary><Info size={14} aria-hidden="true"/>How review works</summary><p>Approval applies to the saved revision. Any edit needs a fresh approval. Live posting is off.</p></details></Card></aside></div>
  </section>;
}

function MediaEditors({preview=false}:{preview?:boolean}) {
  const {preferences}=useDevicePreferences();
  const [kind,setKind]=useState("video");
  useEffect(()=>setKind(preferences.mediaEditor),[preferences.mediaEditor]);
  return <><div className="channel-tabs" aria-label="Media editors"><button aria-pressed={kind==="video"} onClick={()=>setKind("video")}>Video</button><button aria-pressed={kind==="image"} aria-label="Image Editor" onClick={()=>setKind("image")}>Image</button></div>{kind==="video"?<VideoEditor preview={preview}/>:null}<div hidden={kind!=="image"}><ImageEditor preview={preview}/></div></>;
}


function Calendar({items,refresh,openDraft}:{items:Content[];refresh:()=>Promise<void>;openDraft:(id:string)=>void}) {
  const {preferences}=useDevicePreferences();
  const [month,setMonth]=useState(()=>new Date(`${dateKeyInZone(new Date(),preferences.timeZone).slice(0,7)}-01T00:00:00Z`));const [day,setDay]=useState("");const [filter,setFilter]=useState("all");
  const year=month.getUTCFullYear(),index=month.getUTCMonth(),cells=monthGrid(year,index);
  const records=items.filter(i=>i.scheduledFor&&(filter==="all"||i.variants.some(v=>v.platform===filter))).sort((a,b)=>Date.parse(a.scheduledFor!)-Date.parse(b.scheduledFor!));
  const today=dateKeyInZone(new Date(),preferences.timeZone);
  const dated=records.map(item=>({item,key:dateKeyInZone(new Date(item.scheduledFor!),preferences.timeZone)}));
  const counts=new Map<string,number>();for(const {key} of dated)counts.set(key,(counts.get(key)??0)+1);
  const visible=dated.filter(({key})=>day?key===day:key.startsWith(month.toISOString().slice(0,7))).map(({item})=>item);
  function changeMonth(offset:number){setMonth(new Date(Date.UTC(year,index+offset,1)));setDay("");}
  return <section className="workspace-view"><SectionHeading number="03" label="Calendar" title="Make space for your next post." action={<IconButton label="Refresh calendar" onClick={refresh}><RefreshCw size={19}/></IconButton>}/><div className="calendar-toolbar"><div className="month-control"><IconButton label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={19}/></IconButton><h2>{new Intl.DateTimeFormat(preferences.locale,{timeZone:"UTC",month:"long",year:"numeric"}).format(month)}</h2><IconButton label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={19}/></IconButton></div><div className="calendar-filters"><button className={filter==="all"?"selected":""} aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>All</button>{channels.map(p=><IconButton key={p} label={`Filter ${p}`} aria-pressed={filter===p} className={filter===p?"selected":""} onClick={()=>setFilter(p)}><PlatformIcon platform={p}/></IconButton>)}</div></div><Card className="surface calendar-panel"><div className="weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(w=><span key={w}>{w}</span>)}</div><div className="month-grid">{cells.map(cell=>{const count=counts.get(cell.key)??0;return <button key={cell.key} className={`${cell.current?"":"other-month"} ${cell.key===day?"selected":""} ${cell.key===today?"today":""}`} aria-label={`${cell.key}, ${count} scheduled posts`} aria-pressed={day===cell.key} onClick={()=>setDay(old=>old===cell.key?"":cell.key)}><span>{cell.day}</span>{count?<span className="day-post-count">{count}<span className="desktop-only"> post{count>1?"s":""}</span></span>:null}</button>;})}</div></Card><div className="calendar-caption"><span><Clock3 size={13} aria-hidden="true"/>{preferences.city} · {preferences.timeZone.replaceAll("_"," ")}</span><span>Recorded schedules · auto posting off</span></div><div className="schedule-list">{visible.length?visible.map(item=><Card key={item.id} className="surface schedule-row"><div className="schedule-time"><Clock3 size={18} aria-hidden="true"/><strong>{new Intl.DateTimeFormat(preferences.locale,{timeZone:preferences.timeZone,dateStyle:preferences.dateStyle,timeStyle:"short",hour12:preferences.hour12}).format(new Date(item.scheduledFor!))}</strong></div><p>{item.variants[0]?.copy}</p><div className="schedule-channels">{item.variants.map(v=><PlatformBadge key={v.platform} platform={v.platform}/>)}<StatusBadge status={item.status}/></div><button className="text-action" onClick={()=>openDraft(item.id)}>Open draft<ArrowUpRight size={16} aria-hidden="true"/></button></Card>):<EmptyState icon={<CalendarDays size={27}/>} title="A clear calendar." children="Approve a draft, then record a schedule."/>}</div></section>;
}

function BrandProfile({profile,save,preview=false}:{preview?:boolean;profile:Profile;save:(profile:Profile)=>Promise<void>}) {
  const [draft,setDraft]=useState(profile);const [notice,setNotice]=useState("");useEffect(()=>setDraft(profile),[profile]);
  async function saveChanges(){try{await save(draft);setNotice("Brand profile saved in your workspace.");}catch{setNotice("Profile could not be saved. Check your session and retry.");}}
  return <section className="workspace-view"><SectionHeading number="06" label="Profile" title="Make it sound like you."/><div className="settings-grid"><Card className="surface profile-settings"><div className="panel-label"><Settings size={19} aria-hidden="true"/><h2>Your brand profile</h2></div><p className="revision-label">Account type is provided by your social account after OAuth connection.</p><div className="two-fields"><label className="field">Name<input aria-label="Brand or creator name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="field">Language<input aria-label="Content language" value={draft.language} onChange={e=>setDraft({...draft,language:e.target.value})}/></label></div><label className="field">Audience<input aria-label="Audience" value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value})}/></label><label className="field">Voice<textarea aria-label="Writing style" value={draft.voice} onChange={e=>setDraft({...draft,voice:e.target.value})}/></label><label className="field">Topics<input aria-label="Content topics" value={draft.topics} onChange={e=>setDraft({...draft,topics:e.target.value})}/></label><Button disabled={preview||Object.values(draft).some(v=>!v.trim())} onClick={saveChanges} aria-label="Save profile"><Save size={17} aria-hidden="true"/>Save profile<ArrowUpRight size={17} aria-hidden="true"/></Button>{notice?<p role="status" className="action-notice">{notice}</p>:null}</Card><aside><Card className="surface settings-summary"><OrbitMark/><h2>Your voice.<br/><em>Everywhere.</em></h2><div className="setting-line"><ShieldCheck size={19} aria-hidden="true"/><span>Human review</span><span className="on-badge">On</span></div><p className="revision-label">Manage your city, timezone and appearance in Settings.</p><div className="setting-line"><LockKeyhole size={19} aria-hidden="true"/><span>Live publishing</span><span>Off</span></div><details className="small-details"><summary><Info size={14} aria-hidden="true"/>Phone installation</summary><p>Safari → Share → Add to Home Screen → Open as Web App. Use your Orbit account. Your session stays in memory; sign in again after restarting the app.</p></details></Card></aside></div>{preview?<p className="action-notice">Subscription testing requires a configured backend and a signed-in workspace.</p>:<BillingPanel/>}</section>;
}
