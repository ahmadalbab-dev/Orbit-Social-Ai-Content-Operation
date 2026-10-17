"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, Eye, FilePenLine, Film, Hash, House, Info, LayoutDashboard, Link2, LockKeyhole, MoreHorizontal, PenLine, Play, RefreshCw, Save, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card } from "./ui";
import { Dock } from "../../components/ui/dock";
import { DatePicker } from "../../components/ui/date-picker";
import { EmptyState, IconButton, OrbitMark, PlatformBadge, PlatformIcon, SectionHeading, StatusBadge, ToolLink } from "./design-ui";
import { AppearanceToggle, AppearanceSettings, useAppearance } from "./appearance";
import { OrbitField } from "./orbit-field";
import { WorkflowShowcase } from "./workflow-showcase";
import { AiSetup } from "./ai-setup";
import {AI_MODES,type AiMode} from "./ai-modes";
import { ImageEditor } from "./image-editor";
import { VideoEditor } from "./video-editor";
import { BillingPanel } from "./billing-panel";
import { malaysiaDateKey, monthGrid } from "./calendar-data";

const channels = ["facebook", "instagram", "threads"] as const;
type Variant = { platform: string; copy: string; hashtags: string[]; callToAction: string };
type Content = { id: string; topic: string; status: string; revision: number; source?: string; variants: Variant[]; scheduledFor?: string; approvedRevision?: number };
import {brandPayload,profileFromBrand,type Profile,type StoredBrand} from "./brand-profile";
type View = "overview" | "studio" | "video" | "calendar" | "connections" | "settings";
type IntegrationStatus = { providers: Record<string, { credentialsConfigured: boolean; connected?: boolean; accounts?: {name:string;accountType:string|null}[] }> };
const initialProfile: Profile = {name:"My brand",voice:"Warm, clear and practical",audience:"Creators and businesses",topics:"",language:"Bahasa Melayu"};
const navigation = [{ id: "overview", label: "Home", accessible: "Overview", icon: House }, { id: "studio", label: "Studio", accessible: "Content Studio", icon: PenLine }, { id: "video", label: "Media", accessible: "Video Editor", icon: Film }, { id: "calendar", label: "Calendar", accessible: "Calendar", icon: CalendarDays }, { id: "connections", label: "Channels", accessible: "Connections", icon: Link2 }, { id: "settings", label: "Settings", accessible: "Brand Settings", icon: Settings }] as const;
import {api} from "./session-api";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export default function Home({workspaceId,preview=false}:{workspaceId:string;preview?:boolean}) {
  const [view, setView] = useState<View>("overview");
  const [navExpanded,setNavExpanded]=useState(false);
  const dockRef=useRef<HTMLDivElement>(null);
  const launcherRef=useRef<HTMLButtonElement>(null);
  const navHoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const cancelNavHover=useCallback(()=>{if(navHoverTimer.current!==null){clearTimeout(navHoverTimer.current);navHoverTimer.current=null;}},[]);
  useEffect(()=>cancelNavHover,[cancelNavHover]);
  useEffect(()=>{
    if(!navExpanded)return;
    if(window.matchMedia("(max-width:1000px)").matches) dockRef.current?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.focus({preventScroll:true});
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!dockRef.current?.contains(event.target))setNavExpanded(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setNavExpanded(false);requestAnimationFrame(()=>launcherRef.current?.focus({preventScroll:true}));}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[navExpanded]);
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
  const go = (next:View) => { cancelNavHover();setView(next); setNavExpanded(false); window.scrollTo({top:0,behavior:"instant"}); };
  const openDraft = (id:string) => { setOpenedDraft({id,request:Date.now()}); go("studio"); };
  const saveProfile = async (next: Profile) => { const stored=await api<StoredBrand>(next.id?`/brands/${next.id}`:"/brands",next.id?"PUT":"POST",brandPayload(next)); setProfile(profileFromBrand(stored)); };
  const ActiveNavIcon=navigation.find(item=>item.id===view)?.icon??House;
  const scheduledCount=items.filter(post=>post.status==="SCHEDULED").length;
  return <main className={`orbit-shell ${paused?"motion-paused":""}`}>
    <header className="app-header"><button className="brand-word" onClick={()=>go("overview")} aria-label="Orbit home"><OrbitMark small/><span>orbit<span className="word-dot">.</span></span></button><span className="mode-chip"><ShieldCheck size={14} aria-hidden="true"/>{"Review first"}</span><AppearanceToggle/><button className="profile-button" onClick={()=>go("settings")} aria-label="Open profile settings" title={profile.name}>{profile.name.slice(0,1).toUpperCase()}</button></header>
    <div className="navigation-dock" ref={dockRef} data-expanded={navExpanded} onPointerEnter={event=>{if(event.pointerType==="mouse"&&window.matchMedia("(min-width:1001px) and (hover:hover) and (pointer:fine)").matches){cancelNavHover();navHoverTimer.current=setTimeout(()=>{navHoverTimer.current=null;setNavExpanded(true);},180);}}} onPointerLeave={event=>{cancelNavHover();if(event.pointerType==="mouse"&&!dockRef.current?.contains(document.activeElement))setNavExpanded(false);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setNavExpanded(false);}}><button className="nav-launcher" ref={launcherRef} aria-label="Open navigation" aria-expanded={navExpanded} aria-controls="orbit-workspace-nav" onPointerDown={cancelNavHover} onKeyDown={event=>{if(event.key==="ArrowUp"||event.key==="ArrowRight"){event.preventDefault();setNavExpanded(true);requestAnimationFrame(()=>dockRef.current?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.focus());}}} onClick={()=>{cancelNavHover();setNavExpanded(true);requestAnimationFrame(()=>dockRef.current?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.focus());}} title="Navigation"><ActiveNavIcon size={21} aria-hidden="true"/></button><Dock id="orbit-workspace-nav" className="orbit-nav" aria-label="Workspace" items={navigation.map(item=>({...item,badge:item.id==="calendar"&&scheduledCount?(scheduledCount>99?"99+":String(scheduledCount)):undefined}))} activeId={view} onSelect={id=>{go(id as View);requestAnimationFrame(()=>launcherRef.current?.focus({preventScroll:true}));}}/></div>
    <div className="app-content">{notice?<div role="alert" className="alert-message">{notice}<IconButton label="Refresh workspace" onClick={refresh}><RefreshCw size={17}/></IconButton></div>:null}
      <details className="preview-note"><summary><LockKeyhole size={13}/>{preview?"v1 design preview · local tools only":"Private workspace · live posting off"}<Info size={13}/></summary><p>{preview?"Try navigation, Light/Dark mode, image editing and local video previews. AI generation, saved drafts, account connections, server renders and payments require a configured backend and sign-in. Files selected here stay on this device unless you explicitly upload from an authenticated workspace.":"Drafts and brand profiles use the configured backend. Image edits and video previews stay on this device. Video uploads happen only when you choose Upload to workspace; configured workers produce downloadable MP4 files. Live publishing is off."}</p></details>
      <div hidden={view!=="overview"}><Overview profile={profile} items={items} go={go} openDraft={openDraft} paused={paused||view!=="overview"}/></div>
      <div hidden={view!=="studio"}><ContentStudio preview={preview} profile={profile} items={items} onRefresh={refresh} openedDraft={openedDraft}/></div>
      {view==="video"?<MediaEditors preview={preview}/>:null}
      <div hidden={view!=="calendar"}><Calendar items={items} refresh={refresh} openDraft={openDraft}/></div>
      <div hidden={view!=="connections"}><Connections status={connection} preview={preview}/></div>
      <div hidden={view!=="settings"}><BrandSettings preview={preview} profile={profile} save={saveProfile}/></div>
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
  const schedule=()=>action(async()=>{if(!item||!time)throw new Error("Choose a date and time first.");accept(await api<Content>(`/content/${item.id}/schedule`,"POST",{scheduledFor:new Date(`${time}:00+08:00`).toISOString(),expectedRevision:item.revision}));setNotice("Schedule recorded. No background publishing worker is active.");});
  const simulate=()=>action(async()=>{if(!item)return;accept(await api<Content>(`/content/${item.id}/publish`,"POST",{expectedRevision:item.revision}));setNotice("Simulation complete. Nothing was posted to social media.");});
  const approved=!!item&&!dirty&&["APPROVED","SCHEDULED"].includes(item.status);
  const variant=variants.find(v=>v.platform===active)??variants[0];
  const edit=(field:keyof Variant,value:string|string[])=>{if(!variant)return;setVariants(old=>old.map(v=>v.platform===variant.platform?{...v,[field]:value}:v));setDirty(true);setNotice("Unsaved changes. Save and approve again.");};
  return <section className="workspace-view"><SectionHeading number="01" label="Studio" title="Create once. Review every channel."/>
    {preview?<p className="action-notice">Design preview. A…6987 tokens truncated…opt-in release tests passed; full CI is tracked separately for this revision.

Requires real test identity:
- Supabase Site URL/allowed redirect and email confirmation delivery checked in Auth settings. SMTP/recovery email templates remain operator setup.
- First user signup/confirmation and sign-in, workspace creation, two-user isolation, brand save/reload and one live Hugging Face generation with quota persistence. No Auth users existed at activation inspection; no credentials or confirmation emails were fabricated.
- Phone acceptance on live authenticated Studio. Publishing, billing and cloud video rendering remain disabled.

- Hosted acceptance: API readiness 200, trusted web CORS origin exact match, root sign-in page 200, correct API/Auth origins in shipped browser bundle, and direct anon Data API table read denied (401). CI exposed a cancellation-test timing race; the mock now waits until rendering listens for abort, with additional start/abort assertions and no production worker change. All 10 media tests passed locally.

## Compact account entry, 17 October 2026

- Replaced oversized sign-in/signup view with a 400px responsive form, reused animated Orbit hero, distinct registration/recovery links and password visibility control. Removed the internal-token entry from customer UI.
- Failed login retains the email and clears only the password. Documented provider error codes map to fixed safe guidance; raw provider messages are never reflected. Email whitespace is trimmed without changing password characters.
- Investigation at the reported failure found zero registered Auth users; no password reset, email-confirmation bypass or account fabrication was performed. Actual registration/confirmation and live AI generation still require the user's own account.
- Added phone/desktop browser checks for form size, mobile input sizing, signup/recovery navigation and a fully mocked invalid-credentials response. Browser tests use isolated public fixture configuration, never live credentials.

## Account confirmation and responsive navigation, 17 October 2026

- Verified dedicated Orbit Auth aggregate now contains one registered and confirmed user. Auth logs show signup200, mail sending, verification redirect, and password login200. The reported raw fetch error occurs later in the workspace connection. Live canonical API preflight204 and unauthenticated GET401 had correct exact-origin CORS; original browser transport failure is not conclusively attributed to CORS configuration.
- Added a same-origin workspace relay to remove the cross-origin browser dependency. Only known route/method pairs reach the fixed configured API; backend JWT and membership enforcement remain authoritative. No cookies are forwarded upstream, redirects are rejected and private responses are not cached. Relay body cap is4MiB under Vercel's function limit, so hosted media remains disabled pending direct private object-storage uploads. Do not advertise the backend's100MiB ceiling as the browser relay limit.
- Signup returns to sign-in. Confirmation fragments are removed from history before requests, confirmed identity is checked with the provider, and the temporary link session is revoked locally. Confirmation never creates a workspace session or bypasses explicit password sign-in. Reused/expired links show fixed safe guidance.
- Default Light mode preserves explicit saved theme preferences. Auth hero expands independently of the400px form. Lowercase animated ai studio added; navigation starts minimized on desktop and mobile, expands on pointer hover/tap/keyboard and respects reduced motion.
- Code review,65 web unit tests, TypeScript and production build passed. Browser acceptance fixtures cover signup, confirmation, explicit sign-in and workspace onboarding with synthetic intercepted credentials; actual hosted acceptance is tracked separately.
- Prepared customer email template and SMTP instructions in docs/email. Requested sender display name is aistudio.orbit; live branded SMTP sender configuration still requires an authorized sender address/provider and dashboard access. No new email address, SMTP credential or customer account was invented.

## Workspace recovery, animated identity and media editing, 17 October 2026

- Root cause confirmed from dedicated Orbit PostgreSQL logs: named prepared statements already exist behind Supabase transaction pooling. Runtime Prisma configuration now forces pgbouncer compatibility only for recognized Supabase pooler6543 endpoints, preserves the stored secret and direct/session/migration connections, and bounds default per-function pool size. Five-file fix deployed separately as5a33053.
- Hero alternates Orbit/logo and lowercase ai studio in the same canvas position, ai studio60% of Orbit font size, with9second scenes and code-cell dissolve. The separate small signature is removed. Workflow examples type progressively on visibility; indicator pulses describe illustrative writing/ready states and respect reduced motion. Descriptions enlarged below workflow titles.
- Shared iOS-inspired date picker replaces native video date and Studio schedule date; keyboard navigation, Escape, date-only Malaysia keys, readable touch targets and optional time control included.
- Local video export now genuinely records edited frames/audio on the device, using supported MP4 or WebM (never falsely renamed). Includes trim,0.5–2x speed, volume/mute, rotate/flip, News report title/date, timed captions, progress/cancel and bounded duration/bytes. Keep the tab visible while exporting. Hosted worker rendering remains disabled pending private storage/worker readiness.
- Image controls add crop focus,16:9, colour presets, text styling and explicit AI preview upload. AI results cannot replace local edits while processing; decode failures do not report success.
- Real HF image-edit adapter added for fixed Qwen/Qwen-Image-Edit via fal-ai router, Apache2 model reviewed. PNG/JPEG input2MiB, output4MiB, fixed authenticated queue URLs, strict HTTPSfal.media download allowlist, no bearer on CDN, rejected redirects and bounded timeout. Explicit user action sends only a resized preview/prompt. Server guards and atomic workspace AI quota remain required.
- Video AI proposes title, timed caption copy and scene ideas from a written brief only. It does not watch footage, transcribe audio, automatically cut scenes or promise CapCut parity. Review/apply is explicit. Shares the bounded workspace AI attempt quota.
- Provider tokens were not read, real users were not impersonated and no paid image/video provider acceptance call was made. Live provider permissions/credit, first real Studio generation, image edit and iPhone encoding still require acceptance on the user's signed-in account. SMTP branding is still separate pending verified sender setup.
- Updated stale staging-container headline assertion to current sign-in copy; the earlier staging failure was an outdated UI expectation, not a failed API build. Added short generated video fixture for real browser local-export acceptance.

- Release verification: API production readiness returned200 with database connected; unauthenticated media endpoints returned401. Fixed missing direct Express parser dependency and added runtime dependency assertion. Browser CI run40 passed all12 checks, including a genuine edited video download and phone date selection. Desktop calendar popover alignment is also bounded to the viewport; expanded calendar acceptance covers390px and1440px. Real signed-in provider and iPhone acceptance remain pending.

## Resumed verification and useful AI errors, 17 October 2026 evening

- Recovered the existing commercial branch through `1353551`, including the transaction-pooler fix and subsequent JSON parser regression fix. No replacement application was created. Production API readiness returned HTTP 200 with database connected; unauthenticated workspace access returned 401. GitHub reports the API deployment for `1353551` completed.
- Inspected the live web preview: animated Orbit hero, local video speed/volume/format/export controls, and the working October date-picker popover are present. The browser session is signed out, so authenticated workspace creation and paid-provider output were not exercised. A readiness response does not establish either result.
- Studio and video-plan API failures now preserve fixed, actionable provider messages for timeouts, rate limiting, invalid output and missing configuration. Exhausted workspace dollar budgets return 403 with administrator guidance. Unexpected errors remain masked. Failed dispatched attempts retain quota accounting and do not create successful drafts.
- Video planning now distinguishes a deadline from general unavailability and cancels failed response bodies. Added regressions for safe messages despite mutated provider exception text, budget exhaustion, unchanged attempt accounting, video timeout and failed response cleanup.
- Verification: 90 API tests, 27 AI tests and 77 web unit tests passed. Eight database/billing integration tests were skipped because this isolated checkout has no test database configured. API and AI TypeScript checks and builds passed. Actual iPhone export and authenticated text/image/video provider acceptance remain pending.
- Vercel project/detail/log inspection currently returns 404/403 through the connected tool despite project listing access. Release confirmation must use the Git integration's returned status for the exact commit; do not treat an attempted push or a healthy prior deployment as proof a new change is live.

- Authenticated evening acceptance: user signed in through secure browser authentication and `My Office` loaded with OWNER access without a workspace server error. One explicitly labelled short Facebook test generation reached the provider but returned the bounded unavailable message; no successful draft was created. Both Vercel projects deployed `a09f5e9`, and all four CI jobs passed. Studio provider acceptance therefore remains blocked, rather than complete. Provider HTTP errors now distinguish inference access (401/403), billing/credits (402), unavailable model (404) and rejected request configuration (400/422), using fixed messages without exposing response bodies or secrets. This classification enables the next controlled live diagnosis.

- Follow-up live acceptance after `9782a8d` deployed to both projects: created the separate `Orbit Verification` workspace successfully with OWNER access. A second labelled single-platform Studio attempt in that workspace confirmed provider HTTP 402 through the deployed status classifier: provider billing/credits are unavailable. No AI draft was created or published. Operator action is required on the Hugging Face account billing/credit settings before another provider acceptance call; no purchase, auto-recharge or credential change was attempted. Local verification for this revision passed 94 API and 35 AI tests, TypeScript checks, API/AI builds and compiled runtime checks. Eight local database/billing tests were skipped; the unchanged web suite had 77 passing tests. Changed the setup label so configuration alone no longer claims the AI provider is ready.

- CI for `9782a8d` exposed an intermittent launcher interaction: pointer hover expanded the dock and hid the button before a click completed, allowing a dock item to intercept the pointer. Added a short, cancellable desktop-only hover delay, canceling on pointer-down/leave, navigation and unmount; touch/narrow layouts continue to open by tap/click. Existing hover, keyboard and mobile acceptance remain, with a desktop click regression added. This fixes the interaction rather than weakening test actionability checks.

## Groq testing provider, 18 October 2026

- Added opt-in `AI_TEXT_PROVIDER=groq`, server-only `GROQ_API_KEY` and optional `GROQ_MODEL` defaulting to `openai/gpt-oss-20b`. Studio and brief-only video plans use the fixed Groq endpoint, the same output validators and workspace controls. Explicit Groq selection never falls back to HF or OpenAI if a key is missing or inference fails. Provider-specific cache keys avoid cross-provider reuse.
- Kept HF image editing separate: Groq credentials do not activate image editing. Video plans reserve the same shared quota even without an HF token. Removed the hardcoded Hugging Face label while generating text. GPT-OSS requests use bounded completion tokens, low reasoning effort and no returned reasoning, following Groq's own parameter contract.
- Mocked provider/API tests verify actual request routing, key isolation, parsed draft persistence, no automatic fallback, quota rejection before dispatch, video planning without HF and unchanged image credential requirements. Live Groq acceptance remains pending the operator saving the actual key and redeploying the backend. No key was requested in chat, read or created. Setup: [GROQ_SETUP.md](GROQ_SETUP.md).
