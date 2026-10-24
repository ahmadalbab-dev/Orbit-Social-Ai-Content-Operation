"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {MessageSquare,Trash2} from 'lucide-react';
import {OrbitMark} from './design-ui';
import './ai-chat.css';
type Turn={id:number;role:'user'|'assistant'|'notice';text:string};
/** Bounded presentation history only. Never persisted or silently sent to a model. */
export function useAiConversation(scope?:string){
 const [turns,setTurns]=useState<Turn[]>([]),sequence=useRef(0);
 const clear=useCallback(()=>setTurns([]),[]);
 const record=useCallback((role:Turn['role'],text:string)=>{
  const turn={id:++sequence.current,role,text:text.slice(0,4000)};
  setTurns(old=>[...old.slice(-9),turn]);
 },[]);
 useEffect(()=>{clear();},[scope,clear]);
 return {turns,record,clear};
}
export function AiChat({title,description,context,conversation,busy=false,children}:{title:string;description:string;context:string;conversation:ReturnType<typeof useAiConversation>;busy?:boolean;children:ReactNode}){
 return <section className="orbit-ai-chat" aria-label={`${title} chat`}>
  <header className="orbit-chat-bar"><span><MessageSquare size={16} aria-hidden="true"/>Orbit assistant</span><button type="button" disabled={busy||!conversation.turns.length} onClick={conversation.clear} title="Clears messages in this tab. Your draft and media stay unchanged."><Trash2 size={14} aria-hidden="true"/>Clear messages</button></header>
  <div className="orbit-chat-intro"><OrbitMark small/><span className="orbit-chat-context">{context}</span><h3>{title}</h3><p>{description}</p></div>
  {conversation.turns.length?<div className="orbit-chat-messages" role="log" tabIndex={0} aria-label={`${title} messages`} aria-live="polite" aria-relevant="additions"><ol>{conversation.turns.map(turn=><li key={turn.id} className={`orbit-chat-turn orbit-chat-${turn.role}`}><span>{turn.role==='user'?'You':turn.role==='assistant'?'Orbit':'Editor'}</span><p>{turn.text}</p></li>)}</ol></div>:null}
  <div className="orbit-chat-composer" aria-busy={busy}>{children}</div>
  <p className="orbit-chat-footnote">Messages stay in this tab until refresh. Each request uses the current brief or editor settings; earlier messages are not sent automatically.</p>
 </section>;
}
