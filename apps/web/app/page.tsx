"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Film, Link2, PenLine, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card } from "@sma/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WORKSPACE = process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "demo-workspace";
const channels = ["facebook", "instagram", "threads"] as const;
type Variant = { platform: string; copy: string; hashtags: string[]; callToAction: string };
type Content = { id: string; topic: string; status: string; revision: number; source?: string; variants: Variant[]; scheduledFor?: string; approvedRevision?: number };
type Profile = { name: string; mode: "business" | "creator"; voice: string; audience: string; topics: string; language: string };
type View = "studio" | "video" | "calendar" | "connections" | "settings";
type IntegrationStatus = { connectorMode: string; livePublishingSupported?: boolean; persistence?: string; scheduledExecutionSupported?: boolean; providers: Record<string, { credentialsConfigured: boolean; connected?: boolean }> };
const initialProfile: Profile = { name: "azhari_101kerja", mode: "creator", voice: "Santai, bersahaja, jelas dan mesra. Elakkan bahasa kaku dan janji viral.", audience: "Pencari kerja dan komuniti sekitar Kuala Lumpur, Klang dan Selangor", topics: "Kerja kosong, suasana Kuala Lumpur dan perkongsian santai", language: "Bahasa Melayu" };
const navigation = [{ id: "studio", label: "Content Studio", icon: PenLine }, { id: "video", label: "Video Editor", icon: Film }, { id: "calendar", label: "Calendar", icon: CalendarDays }, { id: "connections", label: "Connections", icon: Link2 }, { id: "settings", label: "Brand Settings", icon: Settings }] as const;

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API}/v1${path}`, { method, headers: { "content-type": "application/json", "x-workspace-id": WORKSPACE }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : `Request failed (${response.status})`);
  return data as T;
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Request failed. Please try again.";

export default function Home() {
  const [view, setView] = useState<View>("studio");
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [items, setItems] = useState<Content[]>([]);
  const [connection, setConnection] = useState<IntegrationStatus | null>(null);
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    try { setItems(await api<Content[]>("/content")); setNotice(""); }
    catch (error) { setNotice(`API: ${errorMessage(error)}`); }
  }, []);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("orbit-brand-profile-v1") ?? "null"); if (saved && ["business", "creator"].includes(saved.mode) && ["name", "voice", "audience", "topics", "language"].every((key) => typeof saved[key] === "string")) setProfile(saved); } catch { /* Ignore invalid local preferences. */ }
    void refresh();
    api<IntegrationStatus>("/integrations/status").then(setConnection).catch(() => setConnection(null));
  }, [refresh]);
  const saveProfile = (next: Profile) => { setProfile(next); localStorage.setItem("orbit-brand-profile-v1", JSON.stringify(next)); };
  return <main className="min-h-screen bg-[#f5f5f2] text-slate-950">
    <header className="border-b bg-white px-5 py-5 sm:px-10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2 font-semibold"><Sparkles size={21} /> Orbit Social</div><p className="mt-1 text-sm text-slate-500">Content operations for businesses and creators</p></div><span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">Review first · live publishing inactive</span></div></header>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8"><nav aria-label="Workspace" className="mb-7 flex flex-wrap gap-2">{navigation.map(({id,label,icon:Icon}) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${view === id ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}><Icon size={17} />{label}</button>)}</nav>
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Local demo workspace. Drafts, approvals and schedule records are held in API memory and reset on restart. Calendar entries do not trigger automatic posting. Production sign-in, durable storage and connected accounts are still required.</div>
      {notice && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{notice}</p>}
      {view === "studio" && <ContentStudio profile={profile} items={items} onRefresh={refresh} />}
      {view === "video" && <VideoEditor />}
      {view === "calendar" && <Calendar items={items} refresh={refresh} />}
      {view === "connections" && <Connections status={connection} />}
      {view === "settings" && <BrandSettings profile={profile} save={saveProfile} />}
      <footer className="mt-10 flex flex-wrap gap-5 border-t py-5 text-xs text-slate-500"><span>Orbit Social · {profile.name}</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/data-deletion">Data deletion</a></footer>
    </div>
  </main>;
}

function ContentStudio({profile,items,onRefresh}: {profile:Profile;items:Content[];onRefresh:()=>Promise<void>}) {
  const brandCache = useRef<{ key: string; id: string } | null>(null);
  const [topic,setTopic] = useState("Kongsi peluang mencari kerja dan ajak orang berbual tentang kawasan kerja pilihan mereka.");
  const [selected,setSelected] = useState<string[]>([...channels]);
  const [item,setItem] = useState<Content | null>(null);
  const [variants,setVariants] = useState<Variant[]>([]);
  const [dirty,setDirty] = useState(false);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("Create a draft, edit the copy, then approve the exact revision.");
  const [time,setTime] = useState("");
  async function action(task:()=>Promise<void>) { setBusy(true); try { await task(); await onRefresh(); } catch(error) {setNotice(errorMessage(error));} finally {setBusy(false);} }
  function accept(next:Content) {setItem(next);setVariants(next.variants);setDirty(false);}
  async function save():Promise<Content> {
    if(!item) throw new Error("Create a draft first.");
    const next=await api<Content>(`/content/${item.id}/review`,"PUT",{variants,expectedRevision:item.revision}); accept(next);return next;
  }
  const generate = () => action(async()=>{
    const brandKey = JSON.stringify({name:profile.name,voice:profile.voice,audience:profile.audience});
    const brand = brandCache.current?.key === brandKey ? brandCache.current : await api<{id:string}>("/brands","POST",{name:profile.name,voice:profile.voice,audience:profile.audience});
    brandCache.current = { key:brandKey, id:brand.id };
    const brief=`${topic}\nAccount type: ${profile.mode}\nLanguage: ${profile.language}\nTopics: ${profile.topics}\nUse a natural conversational voice. Do not invent current vacancies, salary, employer details, events or personal experiences. Ask one relevant question; do not guarantee engagement. Return drafts only.`;
    let next: Content;
    try { next=await api<Content>("/content/generate","POST",{brandId:brand.id,topic:brief,platforms:selected}); }
    catch(error) { if(errorMessage(error) === "Brand not found in workspace") brandCache.current=null; throw error; }
    accept(next);setNotice(next.source === "ai" ? "AI draft ready for your review." : "Demo draft ready. AI is not connected; replace the sample wording before approval.");
  });
  const approve = () => action(async()=>{
    if(!item) return;
    const draft=dirty?await save():item;
    const next=await api<Content>(`/content/${draft.id}/approve`,"POST",{expectedRevision:draft.revision});accept(next);setNotice("Approved revision. You can now record a schedule or run a simulation.");
  });
  const schedule = () => action(async()=>{
    if(!item || !time) throw new Error("Choose a date and time first.");
    const next=await api<Content>(`/content/${item.id}/schedule`,"POST",{scheduledFor:new Date(`${time}:00+08:00`).toISOString(),expectedRevision:item.revision});accept(next);setNotice("Schedule recorded in Malaysia time. No background publishing worker is active.");
  });
  const simulate = () => action(async()=>{
    if(!item) return;
    const next=await api<Content>(`/content/${item.id}/publish`,"POST");accept(next);setNotice("Simulation complete. Nothing was posted to social media.");
  });
  const approved=!!item && !dirty && ["APPROVED","SCHEDULED"].includes(item.status);
  const edit=(index:number,field:keyof Variant,value:string|string[])=>{setVariants(old=>old.map((v,i)=>i===index?{...v,[field]:value}:v));setDirty(true);setNotice("Unsaved changes. Save and approve again before scheduling.");};
  return <section className="space-y-5"><div><h1 className="text-3xl font-semibold tracking-tight">Create once. Review every channel.</h1><p className="mt-2 text-sm text-slate-500">{profile.name} · {profile.mode} · {profile.language}</p></div>
    <label className="block text-sm">Open saved draft<select aria-label="Open saved draft" value={item?.id ?? ""} disabled={busy || dirty} onChange={e=>{const saved=items.find(record=>record.id===e.target.value);if(saved){accept(saved);setNotice("Saved content loaded. Review the current revision before continuing.");}}} className="ml-3 max-w-full rounded-xl border bg-white p-3"><option value="">Choose content</option>{items.map(record=><option key={record.id} value={record.id}>{record.status} · {record.variants[0]?.copy.slice(0,60)}</option>)}</select></label><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><Card className="p-6"><label htmlFor="topic" className="font-semibold">What should this post be about?</label><textarea id="topic" value={topic} onChange={e=>setTopic(e.target.value)} className="mt-4 min-h-32 w-full rounded-xl border bg-slate-50 p-4 text-sm leading-6"/><div className="my-4 flex flex-wrap gap-4">{channels.map(platform=><label key={platform} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={selected.includes(platform)} onChange={e=>setSelected(old=>e.target.checked?[...old,platform]:old.filter(x=>x!==platform))}/>{platform}</label>)}</div><Button disabled={busy || !topic.trim() || !selected.length} onClick={generate}>{busy?"Working…":"Generate draft"}</Button></Card>
    {variants.map((v,i)=><Card key={v.platform} className="p-5"><h2 className="mb-4 font-semibold capitalize">{v.platform} draft</h2><label className="block text-sm">Caption<textarea aria-label={`${v.platform} copy`} value={v.copy} onChange={e=>edit(i,"copy",e.target.value)} className="mt-2 min-h-32 w-full rounded-xl border p-3 text-sm leading-6"/></label><label className="mt-3 block text-sm">Hashtags<input aria-label={`${v.platform} hashtags`} value={v.hashtags.join(" ")} onChange={e=>edit(i,"hashtags",e.target.value.split(/\s+/).filter(Boolean))} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label><label className="mt-3 block text-sm">Call to action<input aria-label={`${v.platform} call to action`} value={v.callToAction} onChange={e=>edit(i,"callToAction",e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label><p className="mt-2 text-xs text-slate-500">Caption: {v.copy.length} characters · media is prepared separately in Video Editor.</p></Card>)}</div>
    <div className="space-y-5"><Card className="p-5"><h2 className="font-semibold">Owner review</h2><p role="status" className="mt-3 text-sm leading-6">{notice}</p><p className="mt-3 text-xs text-slate-500">{item?`${dirty?"UNSAVED":item.status} · revision ${item.revision}`:"No draft yet"}</p><Button className="mt-4 w-full" variant="outline" disabled={!item || busy || !dirty} onClick={()=>action(async()=>{await save();setNotice("Draft saved. Approval is required again.");})}>Save draft</Button><Button className="mt-3 w-full" disabled={!item || busy || (!dirty && item.status !== "DRAFT")} onClick={approve}>Approve content</Button><label className="mt-5 block text-sm">Schedule time · Malaysia<input aria-label="Schedule time Malaysia" type="datetime-local" value={time} onChange={e=>setTime(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label><Button className="mt-3 w-full" variant="outline" disabled={!approved || busy || !time} onClick={schedule}>Record schedule</Button><Button className="mt-3 w-full" variant="outline" disabled={!approved || busy} onClick={simulate}>Simulate publishing</Button></Card><Card className="p-5"><ShieldCheck size={21}/><p className="mt-3 text-sm leading-6">Your approval applies to the saved revision. Editing the caption, hashtags or CTA requires a fresh approval. Live automation stays inactive.</p></Card></div></div>
  </section>;
}

function VideoEditor() {
  const [source,setSource] = useState("");
  const [title,setTitle] = useState("Pemandangan terkini\ndi sekitar Kuala Lumpur");
  const [date,setDate] = useState(()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
  const [opacity,setOpacity] = useState(35);
  const [font,setFont] = useState(27);
  const [ratio,setRatio] = useState("original");
  const [originalRatio,setOriginalRatio] = useState(512/910);
  const [notice,setNotice] = useState("");
  const [duration,setDuration] = useState(0);
  const [fps,setFps] = useState(30);
  const file=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source);},[source]);
  const dateLabel=date?new Intl.DateTimeFormat("ms-MY",{timeZone:"Asia/Kuala_Lumpur",day:"numeric",month:"long",year:"numeric"}).format(new Date(`${date}T12:00:00+08:00`)).toUpperCase():"";
  const aspect=ratio==="original"?originalRatio:ratio==="1:1"?1:ratio==="4:5"?.8:9/16;
  function exportSettings(){
    const blob=new Blob([JSON.stringify({template:"News report",title,date:dateLabel,panelOpacity:opacity/100,titleFontSize:font,width:512,height:Math.round(512/aspect/2)*2,videoFile:"scene.mp4",fps,durationInFrames:Math.max(1,Math.ceil(duration*fps)),note:"Confirm fps matches your source before rendering. Duration is calculated from browser metadata. Copy video to tools/news-report/public/scene.mp4."},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="news-report-settings.json";a.click();URL.revokeObjectURL(url);setNotice("Settings exported. Use the local Remotion renderer for MP4; this preview does not upload your video.");
  }
  return <section className="space-y-5"><div><h1 className="text-3xl font-semibold">News report video editor</h1><p className="mt-2 text-sm text-slate-500">Preview your own clip with the approved transparent title style.</p></div><div className="grid gap-5 lg:grid-cols-2"><Card className="space-y-4 p-6"><input ref={file} type="file" accept="video/*" aria-label="Choose video" onChange={e=>{const selected=e.target.files?.[0];if(selected){setDuration(0);setSource(URL.createObjectURL(selected));}}}/><label className="block text-sm">Title<textarea aria-label="Video title" value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border p-3"/></label><label className="block text-sm">Date above title<input aria-label="Video date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label><label className="block text-sm">Panel opacity · {opacity}%<input className="mt-3 w-full" type="range" min="0" max="90" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><label className="block text-sm">Title size · {font}px at 512px width<input className="mt-3 w-full" type="range" min="18" max="40" value={font} onChange={e=>setFont(Number(e.target.value))}/></label><label className="block text-sm">Format<select aria-label="Video format" value={ratio} onChange={e=>setRatio(e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option value="original">Original ratio</option><option>9:16</option><option>4:5</option><option>1:1</option></select></label><label className="block text-sm">Source frame rate<input aria-label="Source frame rate" type="number" min="1" max="120" value={fps} onChange={e=>setFps(Number(e.target.value))} className="mt-2 w-full rounded-xl border p-3"/></label><Button onClick={exportSettings} disabled={!source || !title.trim() || !date || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fps) || fps < 1 || fps > 120}>Export render settings</Button>{notice&&<p role="status" className="text-sm leading-6">{notice}</p>}<p className="text-xs leading-5 text-slate-500">The video stays on your device. Native playback keeps original audio. Duration is read from your clip. Confirm the source frame rate before rendering. This is a title editor, not a trimming or AI video-generation service.</p></Card>
    <Card className="p-4"><div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-xl bg-slate-900" style={{aspectRatio:aspect,containerType:"inline-size"}}>{source?<video src={source} controls playsInline onLoadedMetadata={e=>{setOriginalRatio(e.currentTarget.videoWidth/e.currentTarget.videoHeight);setDuration(e.currentTarget.duration);}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<div className="absolute inset-0 grid place-items-center p-10 text-center text-sm text-slate-400">Choose a video to preview. No sample footage is uploaded.</div>}<div className="pointer-events-none absolute left-0" style={{right:"4.88%",bottom:"18.461538%",padding:"4.296875cqw 5.078125cqw 4.296875cqw 7.421875cqw",background:`rgba(185,12,24,${opacity/100})`}}><div className="absolute font-bold text-white" style={{left:"4.296875cqw",top:"-7.6171875cqw",padding:"1.3671875cqw 2.5390625cqw",borderRadius:"3.515625cqw",fontSize:"3.125cqw",background:"rgba(155,12,24,.65)"}}>{dateLabel}</div><div className="absolute rounded bg-white" style={{left:"4.296875cqw",top:"4.4921875cqw",bottom:"7.6171875cqw",width:".78125cqw"}}/><div style={{fontFamily:"Arial, sans-serif",fontSize:`${font/512*100}cqw`,fontWeight:700,lineHeight:1.22,letterSpacing:"-.05859cqw",whiteSpace:"pre-line",overflowWrap:"anywhere",color:"white",textShadow:"0 1px 4px rgba(0,0,0,.55)"}}>{title}</div><div style={{height:1,background:"rgba(255,255,255,.85)",marginTop:"3.125cqw",width:"92%"}}/></div></div><p className="mt-4 text-center text-xs text-slate-500">Local preview · date sits above the title · transparent red panel</p></Card></div></section>;
}

function Calendar({items,refresh}:{items:Content[];refresh:()=>Promise<void>}) {
  const records=items.filter(item=>item.scheduledFor);
  return <section className="space-y-5"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-semibold">Content calendar</h1><p className="mt-2 text-sm text-slate-500">Recorded schedules · Asia/Kuala_Lumpur · automatic execution inactive</p></div><Button variant="outline" onClick={refresh}>Refresh</Button></div>{records.length?records.map(item=><Card key={item.id} className="p-5"><p className="text-sm font-semibold">{new Intl.DateTimeFormat("en-MY",{timeZone:"Asia/Kuala_Lumpur",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.scheduledFor!))}</p><p className="mt-2 line-clamp-2 text-sm">{item.variants[0]?.copy}</p><p className="mt-3 text-xs text-slate-500">{item.status} · {item.variants.map(v=>v.platform).join(" / ")}</p></Card>):<Card className="p-8 text-sm text-slate-500">No schedules recorded. Create, review and approve a draft in Content Studio first.</Card>}</section>;
}

function Connections({status}:{status:IntegrationStatus|null}) {
  return <section className="space-y-5"><h1 className="text-3xl font-semibold">Social connections</h1><p className="text-sm leading-6 text-slate-500">App credentials and profile links are not account authorization. OAuth consent and server-side account storage are not implemented yet.</p><div className="grid gap-4 md:grid-cols-3">{channels.map(platform=><Card key={platform} className="p-5"><h2 className="text-lg font-semibold capitalize">{platform}</h2><p className="mt-3 text-sm">{platform==="facebook"?"Facebook Page publishing":platform==="instagram"?"Instagram Business or Creator account":"Threads profile publishing"}</p><p className="mt-4 text-xs text-amber-800">{status?`${status.providers[platform]?.credentialsConfigured?"App settings present":"App settings missing"} · ${status.providers[platform]?.connected?"Connected":"Not connected"}`:"Connection status unavailable"}</p><Button className="mt-5 w-full" variant="outline" disabled>OAuth setup pending</Button></Card>)}</div><Card className="p-6"><h2 className="font-semibold">API first, optional agent tools</h2><p className="mt-3 text-sm leading-6">Orbit can use official Meta APIs with per-workspace account consent. The standalone publishing adapters are not enabled in this demo. A future MCP layer should call the same reviewed workflow, so agent actions cannot bypass your approval.</p><div className="mt-4 flex flex-wrap gap-4 text-sm"><a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="underline">Meta developer dashboard</a><a href="https://github.com/gitroomhq/postiz-app" target="_blank" rel="noreferrer" className="underline">Postiz self-hosted alternative</a></div></Card></section>;
}

function BrandSettings({profile,save}:{profile:Profile;save:(profile:Profile)=>void}) {
  const [draft,setDraft]=useState(profile);
  const [notice,setNotice]=useState("");
  return <section className="space-y-5"><h1 className="text-3xl font-semibold">Business or creator profile</h1><Card className="max-w-2xl space-y-4 p-6"><label className="block text-sm">Account type<select aria-label="Account type" value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as Profile["mode"]})} className="mt-2 w-full rounded-xl border p-3"><option value="creator">Content creator</option><option value="business">Business</option></select></label>{([['name','Brand or creator name'],['language','Content language'],['audience','Audience'],['voice','Writing style'],['topics','Content topics']] as const).map(([key,label])=><label key={key} className="block text-sm">{label}<input aria-label={label} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} className="mt-2 w-full rounded-xl border p-3"/></label>)}<Button disabled={Object.values(draft).some(value=>!value.trim())} onClick={()=>{save(draft);setNotice("Profile saved on this browser. Future drafts use these settings.");}}>Save profile</Button>{notice&&<p role="status" className="text-sm">{notice}</p>}<p className="text-xs leading-5 text-slate-500">Profile settings are browser-local. No product, shop destination or medical niche is forced into your content. Human approval stays required.</p></Card></section>;
}
