"use client";

import { useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, ArrowRight, BarChart3, Bot, CalendarDays, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, ExternalLink, Facebook, Film, HelpCircle, Instagram, LayoutDashboard,
  Link2, Menu, Megaphone, MessageCircle, MoreHorizontal, PenLine, Play, Plus, Search, Settings,
  ShieldCheck, ShoppingBag, Sparkles, Target, TrendingUp, Users, Video, WandSparkles, Workflow, X, Zap
} from "lucide-react";
import { Button, Card } from "@sma/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
type View = "overview" | "studio" | "automation" | "calendar" | "campaigns" | "analytics" | "connections" | "settings";
type Variant = { platform: string; copy: string; hashtags: string[]; callToAction: string };
type Icon = ComponentType<{ size?: number; className?: string }>;

const navigation: { id: View; label: string; description: string; icon: Icon }[] = [
  { id: "overview", label: "Overview", description: "Your daily command centre", icon: LayoutDashboard },
  { id: "studio", label: "Content Studio", description: "Create copy, visuals and videos", icon: PenLine },
  { id: "automation", label: "Automation", description: "Build always-on content workflows", icon: Workflow },
  { id: "calendar", label: "Calendar", description: "Review your publishing schedule", icon: CalendarDays },
  { id: "campaigns", label: "Campaigns", description: "Plan product launches and offers", icon: Megaphone },
  { id: "analytics", label: "Analytics", description: "Learn what drives engagement", icon: BarChart3 },
  { id: "connections", label: "Connections", description: "Connect Facebook, Instagram, Threads and TikTok", icon: Link2 },
  { id: "settings", label: "Settings", description: "Brand, AI budget and approvals", icon: Settings }
];

const productPrompt = `Create a compliant Malaysian social campaign for 4Life Transfer Factor.
Goal: educate first, build trust, and invite customers to view the official product page.
Audience: Malaysian adults interested in general wellness and daily immune support.
Tone: warm, practical, evidence-aware, never pushy.
Rules: do not diagnose, treat, cure, or promise prevention; do not invent clinical results; preserve required supplement disclaimers; distinguish brand claims from independent evidence.
Destination: always use the tracked Orbit MyShop link ${process.env.NEXT_PUBLIC_MYSHOP_LINK ?? "http://localhost:3000/go/myshop"} for the call to action.
Deliver: 1 Facebook post, 1 Instagram caption, 1 Threads conversation starter, 1 TikTok/Reel script (25 seconds), 5 hook options, CTA, shot list, on-screen text, and hashtags.`;

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navigation.find((item) => item.id === view)!;
  const navigate = (next: View) => { setView(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-slate-950">
      <Sidebar view={view} navigate={navigate} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} />
      <section className="min-h-screen lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f5f2]/90 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl border bg-white lg:hidden"><Menu size={19}/></button>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400">Orbit Social / {current.label}</p>
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{current.description}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm text-slate-500 shadow-sm sm:flex"><Search size={16}/> Search</button>
              <Button onClick={() => navigate("studio")} className="gap-2 rounded-xl"><Plus size={16}/> <span className="hidden sm:inline">Create content</span></Button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-7 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24, ease: [0.22, 1, 0.36, 1] }}>
              {view === "overview" && <Overview navigate={navigate}/>}
              {view === "studio" && <ContentStudio/>}
              {view === "automation" && <Automation/>}
              {view === "calendar" && <Calendar/>}
              {view === "campaigns" && <Campaigns navigate={navigate}/>}
              {view === "analytics" && <Analytics/>}
              {view === "connections" && <Connections/>}
              {view === "settings" && <SettingsView/>}
            </motion.div>
          </AnimatePresence>
          <footer className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-xs text-slate-500">
            <span>© 2026 Orbit Social</span>
            <a className="hover:text-slate-950 hover:underline" href="/privacy">Privacy</a>
            <a className="hover:text-slate-950 hover:underline" href="/terms">Terms</a>
            <a className="hover:text-slate-950 hover:underline" href="/data-deletion">Data deletion</a>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ view, navigate, mobileOpen, close }: { view: View; navigate: (v: View) => void; mobileOpen: boolean; close: () => void }) {
  const content = <div className="flex h-full flex-col p-4">
    <div className="mb-7 flex items-center justify-between px-2 pt-2">
      <button onClick={() => navigate("overview")} className="flex items-center gap-3 text-left">
        <div className="grid size-10 place-items-center rounded-xl bg-black text-white shadow-lg shadow-black/20"><Sparkles size={19}/></div>
        <div><p className="font-semibold tracking-tight">Orbit Social</p><p className="text-xs text-slate-400">AI content operations</p></div>
      </button>
      <button aria-label="Close navigation" onClick={close} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100 lg:hidden"><X size={18}/></button>
    </div>
    <nav className="space-y-1">
      {navigation.map(({ id, label, icon: NavIcon }) => {
        const active = view === id;
        return <button key={id} onClick={() => navigate(id)} aria-current={active ? "page" : undefined} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${active ? "text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}>
          {active && <motion.span layoutId="active-nav" className="absolute inset-0 rounded-xl bg-slate-950 shadow-md" transition={{ type: "spring", stiffness: 430, damping: 34 }}/>}
          <NavIcon size={18} className="relative z-10"/><span className="relative z-10">{label}</span>
          {id === "connections" && <span className={`relative z-10 ml-auto size-2 rounded-full ${active ? "bg-amber-300" : "bg-amber-500"}`}/>}
        </button>;
      })}
    </nav>
    <div className="mt-auto space-y-3">
      <button onClick={() => navigate("connections")} className="w-full rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-2 text-sm font-semibold"><Zap size={16} className="text-amber-500"/> Finish setup</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Connect your channels to unlock real publishing.</p>
        <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full w-1/2 rounded-full bg-slate-950"/></div>
        <p className="mt-2 text-[11px] text-slate-400">2 of 4 steps complete</p>
      </button>
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">MA</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">My workspace</p><p className="truncate text-xs text-slate-400">Owner</p></div>
        <MoreHorizontal size={17} className="text-slate-400"/>
      </div>
    </div>
  </div>;
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-black/5 bg-white lg:block">{content}</aside>
    <AnimatePresence>{mobileOpen && <><motion.button aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden" onClick={close} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.aside className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-[310px] bg-white shadow-2xl lg:hidden" initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}} transition={{type:"spring",stiffness:390,damping:38}}>{content}</motion.aside></>}</AnimatePresence>
  </>;
}

function Overview({ navigate }: { navigate: (v: View) => void }) {
  const stats = [
    { label: "Content ready", value: "3", note: "Waiting for review", icon: PenLine, color: "bg-violet-100 text-violet-700" },
    { label: "Scheduled", value: "8", note: "Across 4 channels", icon: CalendarDays, color: "bg-blue-100 text-blue-700" },
    { label: "Connections", value: "0/4", note: "Action required", icon: Link2, color: "bg-amber-100 text-amber-700" },
    { label: "AI spend", value: "$0.80", note: "of $10 monthly cap", icon: CircleDollarSign, color: "bg-emerald-100 text-emerald-700" }
  ];
  return <div className="space-y-7">
    <section className="overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-9">
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
        <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs"><Sparkles size={14}/> Guided setup</span><h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Turn your product knowledge into a week of useful content.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Create compliant copy, short-video scripts and platform-ready variants—then review everything before it goes live.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => navigate("studio")} className="bg-white text-black hover:bg-slate-100">Create first campaign <ArrowRight size={16}/></Button><Button onClick={() => navigate("connections")} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Connect channels</Button></div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"><p className="text-sm font-medium">Launch checklist</p><div className="mt-4 space-y-3">{[["Brand profile",true],["OpenAI connected",true],["Social accounts",false],["First campaign",false]].map(([x,done])=><div key={String(x)} className="flex items-center gap-3 text-sm"><span className={`grid size-6 place-items-center rounded-full ${done?"bg-emerald-400 text-black":"border border-white/20 text-slate-500"}`}>{done&&<Check size={14}/>}</span><span className={done?"text-white":"text-slate-400"}>{String(x)}</span></div>)}</div></div>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((s,i)=><motion.div key={s.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}><Card className="h-full p-5 transition hover:-translate-y-1 hover:shadow-md"><div className={`grid size-10 place-items-center rounded-xl ${s.color}`}><s.icon size={18}/></div><p className="mt-5 text-2xl font-semibold tracking-tight">{s.value}</p><p className="mt-1 text-sm font-medium">{s.label}</p><p className="mt-1 text-xs text-slate-400">{s.note}</p></Card></motion.div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">This week</h3><p className="mt-1 text-sm text-slate-400">Your content production flow</p></div><button onClick={()=>navigate("calendar")} className="text-sm font-medium">Open calendar →</button></div><div className="mt-6 grid grid-cols-7 gap-2">{["M","T","W","T","F","S","S"].map((d,i)=><div key={`${d}-${i}`} className="text-center"><p className="text-xs text-slate-400">{d}</p><div className={`mx-auto mt-3 grid size-10 place-items-center rounded-xl text-sm ${i===1?"bg-black text-white":i<5?"bg-slate-100":"border"}`}>{28+i}</div>{i<4&&<div className={`mx-auto mt-3 size-1.5 rounded-full ${["bg-pink-500","bg-blue-500","bg-violet-500"][i%3]}`}/>}</div>)}</div></Card>
      <Card className="p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Link2 size={18}/></div><div><h3 className="font-semibold">Connect your audience</h3><p className="text-sm text-slate-400">Publishing is still in sandbox</p></div></div><div className="mt-5 space-y-3">{[["Facebook","Ready to configure"],["Instagram","Requires Meta app"],["Threads","Requires Threads API setup"],["TikTok","Requires developer review"]].map(([p,s])=><div key={p} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm font-medium">{p}</span><span className="text-xs text-amber-700">{s}</span></div>)}</div><Button onClick={()=>navigate("connections")} className="mt-5 w-full" variant="outline">Open connections</Button></Card>
    </div>
  </div>;
}

function ContentStudio() {
  const [topic,setTopic]=useState("Educate customers about daily immune support and invite them to view the official 4Life product range.");
  const [variants,setVariants]=useState<Variant[]>([]);
  const [contentId,setContentId]=useState("");
  const [status,setStatus]=useState("Ready to create");
  const [mode,setMode]=useState<"copy"|"video">("copy");
  async function generate(){
    try {
      setStatus("Preparing your brand profile…");
      const brand=await fetch(`${API}/v1/brands`,{method:"POST",headers:{"content-type":"application/json","x-workspace-id":"demo-workspace"},body:JSON.stringify({name:"4Life Transfer Factor Malaysia",voice:"warm, clear, compliant and evidence-aware",audience:"Malaysian adults interested in general wellness"})}).then(r=>r.json());
      setStatus("Creating platform-specific content…");
      const item=await fetch(`${API}/v1/content/generate`,{method:"POST",headers:{"content-type":"application/json","x-workspace-id":"demo-workspace"},body:JSON.stringify({brandId:brand.id,topic:`${topic}\n\n${productPrompt}`,platforms:["facebook","instagram","threads","tiktok"]})}).then(r=>r.json());
      setContentId(item.id);setVariants(item.variants??[]);setStatus("Draft ready—review every claim before publishing");
    } catch { setStatus("Could not reach the API. Check that localhost:3001 is running."); }
  }
  async function approve(){await fetch(`${API}/v1/content/${contentId}/review`,{method:"PUT",headers:{"content-type":"application/json","x-workspace-id":"demo-workspace"},body:JSON.stringify({variants})});setStatus("Approved. Open Calendar to choose a publishing time.");}
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="chip"><WandSparkles size={14}/> AI creation workspace</span><h2 className="mt-3 text-3xl font-semibold tracking-tight">What are we creating today?</h2><p className="mt-2 text-sm text-slate-500">Start with the goal. Orbit handles platform formatting and keeps you in control.</p></div><div className="flex rounded-xl border bg-white p-1"><button onClick={()=>setMode("copy")} className={`rounded-lg px-4 py-2 text-sm font-medium ${mode==="copy"?"bg-black text-white":"text-slate-500"}`}>Post campaign</button><button onClick={()=>setMode("video")} className={`rounded-lg px-4 py-2 text-sm font-medium ${mode==="video"?"bg-black text-white":"text-slate-500"}`}>Short video</button></div></div>
    {mode==="copy"?<div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5"><Card className="p-6"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Target size={20}/></div><div className="flex-1"><label htmlFor="goal" className="font-semibold">Campaign goal</label><p className="mt-1 text-sm text-slate-400">Describe the outcome in plain language.</p><textarea id="goal" value={topic} onChange={e=>setTopic(e.target.value)} className="mt-4 min-h-32 w-full rounded-2xl border bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:bg-white focus:ring-2 focus:ring-black"/></div></div><div className="mt-5 flex flex-wrap gap-2 border-t pt-5">{["Facebook","Instagram","Threads","TikTok"].map(x=><span className="chip" key={x}><CheckCircle2 size={14} className="text-emerald-600"/>{x}</span>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">One batched request • estimated below $0.01</p><Button onClick={generate} className="gap-2 rounded-xl"><Sparkles size={16}/> Generate campaign</Button></div></Card>
      {variants.length>0&&<div className="space-y-4">{variants.map((v,i)=><motion.div key={v.platform} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.08}}><Card className="p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><PlatformMark platform={v.platform}/><div><p className="text-sm font-semibold capitalize">{v.platform}</p><p className="text-xs text-slate-400">Editable draft</p></div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">Review claims</span></div><textarea aria-label={`${v.platform} copy`} value={v.copy} onChange={e=>setVariants(old=>old.map((x,j)=>j===i?{...x,copy:e.target.value}:x))} className="min-h-36 w-full rounded-xl border p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-black"/><div className="mt-3 flex flex-wrap gap-1.5">{v.hashtags.map(h=><span key={h} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{h}</span>)}</div></Card></motion.div>)}</div>}</div>
      <div className="space-y-5"><Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow status</p><p className="mt-3 font-semibold">{status}</p><div className="mt-5 space-y-3">{["Create draft","Review wording","Approve content","Choose schedule"].map((x,i)=><div key={x} className="flex items-center gap-3 text-sm"><span className={`grid size-7 place-items-center rounded-full ${i===0||variants.length?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{i===0||variants.length?<Check size={14}/>:i+1}</span>{x}</div>)}</div><Button className="mt-5 w-full rounded-xl" variant="outline" disabled={!contentId} onClick={approve}>Approve campaign</Button></Card><ComplianceCard/></div>
    </div>:<VideoLab/>}
  </div>;
}

function VideoLab(){
  const [format,setFormat]=useState("9:16 Reel");
  const scenes=[["0–3s","Hook","Your daily wellness routine might be missing one simple step."],["3–10s","Problem","Busy days make consistency difficult."],["10–19s","Value","Explain the official product positioning using approved wording."],["19–25s","CTA","Learn more from the official 4Life Malaysia product page."]];
  return <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><Card className="overflow-hidden bg-slate-950 text-white"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h3 className="font-semibold">Short-video storyboard</h3><p className="mt-1 text-sm text-slate-400">Motion preview • Remotion-ready composition</p></div><select value={format} onChange={e=>setFormat(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm"><option className="text-black">9:16 Reel</option><option className="text-black">1:1 Feed</option><option className="text-black">16:9 Video</option></select></div><div className="grid min-h-[520px] place-items-center p-7"><motion.div className="relative aspect-[9/16] h-[450px] overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-300 via-teal-500 to-slate-950 shadow-2xl" animate={{boxShadow:["0 20px 60px rgba(16,185,129,.15)","0 26px 80px rgba(16,185,129,.35)","0 20px 60px rgba(16,185,129,.15)"]}} transition={{duration:3,repeat:Infinity}}><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,.45),transparent_30%)]"/><div className="absolute inset-x-6 bottom-8"><span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium backdrop-blur">4LIFE MALAYSIA</span><motion.p className="mt-4 text-3xl font-semibold leading-tight" initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.2}}>A simpler daily wellness routine.</motion.p><p className="mt-3 text-xs leading-5 text-white/75">Educational content • Review official product information before publishing.</p><div className="mt-5 flex items-center gap-2 text-xs font-medium"><span className="grid size-8 place-items-center rounded-full bg-white text-black"><Play size={13} fill="currentColor"/></span> Preview 25 seconds</div></div></motion.div></div></Card><div className="space-y-5"><Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Scene plan</h3><span className="text-xs text-slate-400">25 sec</span></div><div className="mt-5 space-y-3">{scenes.map(([time,label,copy],i)=><motion.div key={time} whileHover={{x:4}} className="rounded-xl border p-4"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-violet-600">{time}</span><span className="text-xs text-slate-300">•</span><span className="text-xs font-medium">{label}</span></div><p className="mt-2 text-sm leading-5 text-slate-500">{copy}</p></motion.div>)}</div></Card><Card className="p-5"><div className="flex items-center gap-3"><Film size={18}/><h3 className="font-semibold">Rendering options</h3></div><p className="mt-3 text-sm leading-6 text-slate-500">The storyboard can be rendered locally with Remotion after confirming its commercial license, or exported to Canva/CapCut as a shot list with captions.</p><Button className="mt-4 w-full" variant="outline">Export production brief</Button></Card></div></div>;
}

function Automation(){
  const [enabled,setEnabled]=useState(true);
  const [approval,setApproval]=useState(true);
  const [notice,setNotice]=useState("");
  const steps=[
    {title:"Plan weekly topics",detail:"Every Monday • product education, FAQ and routine ideas",icon:Target,state:"Automatic"},
    {title:"Generate campaign batch",detail:"One AI call creates Facebook, Instagram, Threads and TikTok variants",icon:Bot,state:"Cost-capped"},
    {title:"Create reel brief",detail:"Hook, 4-scene shot list, voiceover, captions and visual prompts",icon:Film,state:"Automatic"},
    {title:"Compliance and owner review",detail:"Flag health claims and pause until the workspace owner approves",icon:ShieldCheck,state:"Required"},
    {title:"Schedule for each channel",detail:"Use the content calendar and each account’s preferred publishing window",icon:CalendarDays,state:"Queued"},
    {title:"Publish and route to MyShop",detail:"Post through the approved connector and use Orbit’s central /go/myshop link",icon:ShoppingBag,state:"Tracked"},
    {title:"Measure and improve",detail:"Collect platform analytics after 24h and recommend the next variation",icon:TrendingUp,state:"Learning"}
  ];
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="chip"><Workflow size={14}/> Always-on workflow</span><h2 className="mt-3 text-3xl font-semibold tracking-tight">Automate the repeatable work.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Orbit creates a weekly batch, stops for your approval, publishes on schedule, routes interested customers to MyShop, and learns from results.</p></div><button role="switch" aria-checked={enabled} onClick={()=>setEnabled(!enabled)} className={`neo-button relative h-10 w-[86px] rounded-full p-1 text-xs font-bold text-white ${enabled?"bg-teal-700":"bg-slate-500"}`}><motion.span className="absolute top-1 grid size-8 place-items-center rounded-full bg-white text-slate-900" animate={{left:enabled?50:4}}/><span className={enabled?"mr-9":"ml-9"}>{enabled?"ON":"OFF"}</span></button></div>
    <Card className="overflow-hidden p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">MyShop growth loop</p><h3 className="mt-2 text-xl font-semibold">Weekly education → approved publishing → measured visits</h3></div><a href="/go/myshop" target="_blank" rel="noreferrer" className="neo-button-light inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold">Test MyShop link <ExternalLink size={15}/></a></div><div className="mt-8 grid gap-4">{steps.map((step,i)=><motion.div key={step.title} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*.05}} className="neo-inset grid gap-4 rounded-2xl p-4 sm:grid-cols-[44px_1fr_auto] sm:items-center"><div className="grid size-11 place-items-center rounded-xl bg-teal-700 text-white shadow-md"><step.icon size={19}/></div><div><div className="flex items-center gap-2"><span className="text-xs font-bold text-teal-700">{String(i+1).padStart(2,"0")}</span><h4 className="font-semibold">{step.title}</h4></div><p className="mt-1 text-sm leading-5 text-slate-600">{step.detail}</p></div><span className="chip justify-center">{step.state}</span></motion.div>)}</div></Card>
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><Card className="p-6"><h3 className="font-semibold">Safety and publishing rules</h3><div className="mt-5 space-y-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Require approval before publishing</p><p className="mt-1 text-xs text-slate-500">Keep enabled for wellness and product content.</p></div><button role="switch" aria-checked={approval} onClick={()=>setApproval(!approval)} className={`relative h-8 w-14 rounded-full ${approval?"bg-teal-700":"bg-slate-400"}`}><motion.span className="absolute top-1 size-6 rounded-full bg-white shadow" animate={{left:approval?28:4}}/></button></div>{["Never exceed the workspace AI budget","Do not publish duplicate content","Pause when a connector loses authorization","Use approved claims and the central MyShop link"].map(x=><div key={x} className="flex items-center gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14}/></span>{x}</div>)}</div></Card><Card className="p-6"><h3 className="font-semibold">Workflow status</h3><div className="neo-inset mt-5 rounded-2xl p-5 text-center"><Activity className="mx-auto text-teal-700"/><p className="mt-3 text-2xl font-semibold">{enabled?"Ready":"Paused"}</p><p className="mt-1 text-xs text-slate-500">{enabled?"Waiting for live social connections":"No automated jobs will run"}</p></div><Button onClick={()=>setNotice("Automation is configured in safe preview mode. Live jobs begin only after account OAuth, production deployment, and a successful test post.")} className="mt-5 w-full">{enabled?"Run safe preview":"Enable workflow"}</Button>{notice&&<p className="mt-4 text-xs leading-5 text-teal-800">{notice}</p>}</Card></div>
  </div>;
}

function Calendar(){
  const items=[["09:00","Instagram","Daily routine carousel","Draft"],["12:30","Facebook","Wellness education post","Review"],["18:00","TikTok","25-second product explainer","Planned"]];
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-3xl font-semibold tracking-tight">Publishing calendar</h2><p className="mt-2 text-sm text-slate-500">Drag-and-drop scheduling arrives after social accounts are connected.</p></div><Button><Plus size={16}/> Schedule content</Button></div><Card className="overflow-hidden"><div className="flex items-center justify-between border-b p-5"><button className="rounded-lg border px-3 py-2 text-sm">← Previous</button><h3 className="font-semibold">July 28 – August 3, 2026</h3><button className="rounded-lg border px-3 py-2 text-sm">Next →</button></div><div className="grid grid-cols-7 border-b bg-slate-50">{["Mon 27","Tue 28","Wed 29","Thu 30","Fri 31","Sat 1","Sun 2"].map((x,i)=><div key={x} className={`border-r p-3 text-center text-xs ${i===1?"font-semibold text-violet-700":"text-slate-400"}`}>{x}</div>)}</div><div className="min-h-[420px] p-5"><div className="grid gap-3">{items.map(([time,channel,title,status],i)=><motion.div key={title} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*.07}} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[70px_120px_1fr_90px] sm:items-center"><span className="text-sm font-semibold">{time}</span><span className="text-sm">{channel}</span><span className="text-sm font-medium">{title}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs">{status}</span></motion.div>)}</div></div></Card></div>;
}

function Campaigns({navigate}:{navigate:(v:View)=>void}){
  const campaigns=[["Transfer Factor Education Week","4 drafts","Facebook • Instagram • Threads • TikTok","In progress"],["Customer FAQ Series","0 posts","All channels","Planning"],["August Wellness Routine","8 posts","Instagram • Facebook • Threads","Ready"]];
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-semibold tracking-tight">Campaigns</h2><p className="mt-2 text-sm text-slate-500">Group content around one clear business outcome.</p></div><Button onClick={()=>navigate("studio")}><Plus size={16}/> New campaign</Button></div><div className="grid gap-4 lg:grid-cols-3">{campaigns.map(([name,count,channels,status],i)=><motion.button key={name} onClick={()=>navigate("studio")} whileHover={{y:-5}} className="text-left"><Card className="h-full overflow-hidden"><div className={`h-2 ${["bg-violet-500","bg-amber-400","bg-emerald-500"][i]}`}/><div className="p-5"><div className="flex items-start justify-between"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium">{status}</span><MoreHorizontal size={17} className="text-slate-400"/></div><h3 className="mt-5 text-lg font-semibold">{name}</h3><p className="mt-2 text-sm text-slate-400">{channels}</p><div className="mt-6 flex items-center justify-between border-t pt-4"><span className="text-sm font-medium">{count}</span><ChevronRight size={17}/></div></div></Card></motion.button>)}</div><Card className="border-dashed p-6"><div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles size={20}/></div><div><h3 className="font-semibold">Recommended campaign</h3><p className="mt-1 text-sm text-slate-500">Create a seven-day education sequence: problem awareness → routine → official product information → FAQ → soft CTA.</p></div><Button onClick={()=>navigate("studio")} variant="outline">Use this plan</Button></div></Card></div>;
}

function Analytics(){
  const bars=[36,54,46,72,63,88,76];
  return <div className="space-y-6"><div><h2 className="text-3xl font-semibold tracking-tight">Analytics</h2><p className="mt-2 text-sm text-slate-500">Sample data appears until live accounts are connected.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total reach","12.4K","+18%",Users],["Engagement","6.8%","+1.2%",Activity],["Link clicks","428","+24%",Target],["Best channel","Instagram","Reels",TrendingUp]].map(([l,v,n,I])=><Card key={String(l)} className="p-5"><I size={18} className="text-violet-600"/><p className="mt-4 text-2xl font-semibold">{String(v)}</p><p className="mt-1 text-sm font-medium">{String(l)}</p><p className="mt-1 text-xs text-emerald-600">{String(n)}</p></Card>)}</div><div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Engagement trend</h3><p className="mt-1 text-sm text-slate-400">Last 7 days</p></div><span className="chip">Sample data</span></div><div className="mt-8 flex h-64 items-end gap-3">{bars.map((h,i)=><div key={i} className="flex flex-1 flex-col items-center gap-3"><motion.div initial={{height:0}} animate={{height:`${h}%`}} transition={{duration:.6,delay:i*.06}} className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-300"/><span className="text-xs text-slate-400">{["M","T","W","T","F","S","S"][i]}</span></div>)}</div></Card><Card className="p-6"><h3 className="font-semibold">What to do next</h3><div className="mt-5 space-y-4">{[["Use a human face in the first 2 seconds","Expected lift: 12–18%"],["Keep Facebook copy under 120 words","Your shorter posts perform better"],["Publish Reels between 6–8 PM","Based on audience activity"]].map(([a,b])=><div key={a} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium">{a}</p><p className="mt-1 text-xs text-slate-400">{b}</p></div>)}</div></Card></div></div>;
}

function Connections(){
  const [notice,setNotice]=useState("");
  const channels=[{name:"Facebook",icon:Facebook,color:"bg-blue-600",note:"Pages and publishing",requirements:"Meta app + Facebook Page"},{name:"Instagram",icon:Instagram,color:"bg-gradient-to-br from-pink-500 to-violet-600",note:"Professional accounts",requirements:"Instagram Professional account linked to a Page"},{name:"Threads",icon:MessageCircle,color:"bg-slate-950",note:"Text, image and video conversations",requirements:"Threads profile + Threads API configuration"},{name:"TikTok",icon:Video,color:"bg-black",note:"Direct video and photo posts",requirements:"TikTok developer app + Content Posting review"}];
  const begin=(name:string)=>setNotice(`${name} needs a developer app before account consent can begin. Open the setup checklist below; no password or token should be pasted into this app.`);
  return <div className="space-y-6"><div><span className="chip"><ShieldCheck size={14} className="text-emerald-600"/> Secure OAuth only</span><h2 className="mt-3 text-3xl font-semibold tracking-tight">Connect your social accounts</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">You will sign in on each platform’s own consent screen. Orbit stores encrypted access tokens on the server and never asks for your social password.</p></div>{notice&&<motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{notice}</motion.div>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{channels.map((c)=><Card key={c.name} className="p-5"><div className={`grid size-12 place-items-center rounded-2xl text-white ${c.color}`}><c.icon size={22}/></div><h3 className="mt-5 text-lg font-semibold">{c.name}</h3><p className="mt-1 text-sm text-slate-400">{c.note}</p><div className="mt-5 rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Required first</p><p className="mt-1 text-sm">{c.requirements}</p></div><Button onClick={()=>begin(c.name)} className="mt-5 w-full" variant="outline">Configure {c.name}</Button></Card>)}</div><Card className="p-6"><h3 className="font-semibold">Connection checklist</h3><div className="mt-5 grid gap-4 md:grid-cols-2">{[["1","Configure your Meta app","Add Facebook Login for Business, Instagram API and Threads API."],["2","Add production URLs","Privacy policy, terms, website and exact OAuth callbacks."],["3","Request publishing permissions","Submit the platform permissions and review evidence required for public users."],["4","Authorize your accounts","Return to Orbit and complete each official platform consent screen."]].map(([n,t,d])=><div key={n} className="flex gap-3 rounded-xl border p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-sm text-white">{n}</span><div><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs leading-5 text-slate-400">{d}</p></div></div>)}</div></Card></div>;
}

function SettingsView(){
  const [approval,setApproval]=useState(true);
  const [budget,setBudget]=useState(10);
  return <div className="space-y-6"><div><h2 className="text-3xl font-semibold tracking-tight">Workspace settings</h2><p className="mt-2 text-sm text-slate-500">Simple controls for your brand, AI spending and publishing safety.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-5"><Card className="p-6"><h3 className="font-semibold">Brand profile</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Brand name" value="4Life Transfer Factor Malaysia"/><Field label="Primary market" value="Malaysia"/><Field label="Audience" value="Adults interested in general wellness"/><Field label="Voice" value="Warm, practical, evidence-aware"/></div><Button className="mt-5" variant="outline">Save brand profile</Button></Card><Card className="p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Approval before publishing</h3><p className="mt-1 text-sm text-slate-400">Recommended for health and wellness content.</p></div><button role="switch" aria-checked={approval} onClick={()=>setApproval(!approval)} className={`relative h-7 w-12 rounded-full transition ${approval?"bg-emerald-600":"bg-slate-400"}`}><motion.span layout className="absolute top-1 size-5 rounded-full bg-white shadow" animate={{left:approval?24:4}}/></button></div></Card><Card className="p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Official Orbit logo reference</h3><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Embedded from the Pinterest pin you supplied. For production favicon, email, exports, and offline use, replace this embed with an owned SVG/PNG master file.</p></div><ExternalLink size={18} className="text-slate-400"/></div><div className="neo-inset mt-5 grid max-h-[440px] place-items-center overflow-hidden rounded-2xl p-4"><iframe title="Orbit logo animation supplied by the workspace owner" src="https://assets.pinterest.com/ext/embed.html?id=840554717970149711" width="345" height="714" loading="lazy" className="max-w-full rounded-2xl border-0"/></div></Card></div><div className="space-y-5"><Card className="p-6"><h3 className="font-semibold">Monthly AI budget</h3><p className="mt-1 text-sm text-slate-400">Hard limit across this workspace.</p><div className="mt-5 flex items-center gap-3"><span className="text-2xl font-semibold">$</span><input type="number" min={1} max={1000} value={budget} onChange={e=>setBudget(Number(e.target.value))} className="w-full rounded-xl border p-3 text-xl font-semibold outline-none focus:ring-2 focus:ring-black"/></div><div className="neo-inset mt-4 h-3 rounded-full p-0.5"><div className="h-full w-[8%] rounded-full bg-emerald-600"/></div><p className="mt-2 text-xs text-slate-400">$0.80 estimated usage this month</p></Card><ComplianceCard/></div></div></div>;
}

function Field({label,value}:{label:string;value:string}){return <label className="text-sm font-medium">{label}<input defaultValue={value} className="mt-2 w-full rounded-xl border bg-slate-50 p-3 text-sm font-normal outline-none focus:bg-white focus:ring-2 focus:ring-black"/></label>}
function PlatformMark({platform}:{platform:string}){const p=platform.toLowerCase();const I=p==="facebook"?Facebook:p==="instagram"?Instagram:p==="threads"?MessageCircle:Video;return <span className={`grid size-10 place-items-center rounded-xl text-white ${p==="facebook"?"bg-blue-600":p==="instagram"?"bg-gradient-to-br from-pink-500 to-violet-600":"bg-black"}`}><I size={18}/></span>}
function ComplianceCard(){return <Card className="border-emerald-100 bg-emerald-50/60 p-5"><div className="flex gap-3"><ShieldCheck size={20} className="shrink-0 text-emerald-700"/><div><p className="text-sm font-semibold text-emerald-950">Wellness content guardrails</p><p className="mt-2 text-xs leading-5 text-emerald-800">Avoid disease, treatment, cure and guaranteed-result claims. Use approved product language, disclose material relationships, and keep the official supplement disclaimer where required.</p></div></div></Card>}
