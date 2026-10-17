"use client";
import {useEffect,useState} from "react";
import {Sparkles,RefreshCw} from "lucide-react";
import {api} from "./session-api";
export function AiSetup({onReady}:{onReady:(ready:boolean)=>void}){
 const [state,setState]=useState("Checking AI setup…");const [checking,setChecking]=useState(false);
 async function check(){setChecking(true);try{const data=await api<{configured:boolean}>("/ai/status");onReady(data.configured);setState(data.configured?"AI is set up. Provider availability and credits are checked when you generate. Your brief is sent only when you choose Generate.":"AI setup required. The workspace operator must configure the server AI provider.");}catch{onReady(false);setState("AI status unavailable. Check your session or ask your workspace operator.");}finally{setChecking(false);}}
 useEffect(()=>{void check();},[onReady]);
 return <section className="surface ai-setup"><div className="ai-setup-body"><p><Sparkles size={17}/> Orbit AI</p><p role="status">{state}</p><button className="text-action" onClick={check} disabled={checking}><RefreshCw size={15}/>Check setup</button></div></section>;
}
