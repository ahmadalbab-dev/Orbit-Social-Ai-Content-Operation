"use client";
import {useEffect,useRef,useState} from "react";
import {Sparkles,RefreshCw} from "lucide-react";
import {api} from "./session-api";
type AiStatus={configured:boolean;provider?:string|null;model?:string|null;verified?:boolean;privacy?:{unpaidDataUse:boolean;unpaidDataUseAcknowledged:boolean;previewSharingAllowed:boolean}};
export function AiSetup({onReady}:{onReady:(ready:boolean)=>void}){
 const [state,setState]=useState("Checking AI setup…"),[details,setDetails]=useState<AiStatus|null>(null),[checking,setChecking]=useState(false);
 const attempt=useRef(0);
 async function check(){
  const current=++attempt.current;setChecking(true);onReady(false);setDetails(null);
  try{
   const data=await api<AiStatus>("/ai/status");if(current!==attempt.current)return;
   onReady(data.configured===true);setDetails(data);
   setState(data.configured?"AI is set up. Provider availability and credits are checked when you generate. Checking setup does not send your brief or use an AI attempt.":"AI setup required. The workspace operator must configure the server AI provider.");
  }catch{if(current!==attempt.current)return;onReady(false);setState("AI status unavailable. Check your session or ask your workspace operator.");}
  finally{if(current===attempt.current)setChecking(false);}
 }
 useEffect(()=>{void check();return()=>{attempt.current++;};},[onReady]);
 return <section className="surface ai-setup" aria-label="Workspace AI connection"><div className="ai-setup-body"><p><Sparkles size={17}/> Orbit AI</p><p role="status">{state}</p>
  {details?.provider?<p className="revision-label">Text connection: {details.provider}{details.model?` · ${details.model}`:""}. Configuration check only; a successful generation confirms model access.</p>:null}
  {details?.provider==="gemini"?<p className="revision-label">Gemini unpaid-service notice: Google may use your brief, brand profile and AI responses to improve its products, including human review. Use non-sensitive creative material; do not submit private or confidential information. Your original media is not sent by Studio. {details.privacy?.unpaidDataUseAcknowledged===false?"The workspace operator must acknowledge this data policy before Gemini can be used.":""}</p>:null}
  <button type="button" className="text-action" onClick={check} disabled={checking}><RefreshCw size={15}/>Check setup</button></div></section>;
}
