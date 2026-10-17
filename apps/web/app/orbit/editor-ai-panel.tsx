"use client";
import {useEffect,useRef,useState} from 'react';
import {Sparkles,X,ArrowUpRight} from 'lucide-react';
import {apiResponse} from './session-api';
import {Button} from './ui';
import {validEditorChanges,validEditorTiming,type ImageEditorChanges,type ImageEditorState,type VideoEditorChanges,type VideoEditorState,type EditorPlan} from './editor-ai-contract';
import './editor-ai.css';
type Props={disabled:boolean;preview:boolean}&({kind:'image';current:ImageEditorState;onApply:(changes:ImageEditorChanges)=>void}|{kind:'video';current:VideoEditorState;onApply:(changes:VideoEditorChanges)=>void});
export function EditorAiPanel(props:Props){
 const [instruction,setInstruction]=useState(''),[plan,setPlan]=useState<EditorPlan|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null),snapshot=JSON.stringify(props.current),current=useRef(snapshot),prepared=useRef('');current.current=snapshot;
 useEffect(()=>{setPlan(null);return ()=>{pending.current?.abort();};},[snapshot]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 async function generate(){
  if(busy||props.disabled||props.preview||!instruction.trim())return;
  const controller=new AbortController(),before=snapshot;pending.current=controller;setBusy(true);setNotice('');setPlan(null);
  try{
   const response=await apiResponse('/media/editor-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:props.kind,instruction:instruction.trim(),current:props.current}),signal:controller.signal});
   const result=await response.json() as EditorPlan;
   if(controller.signal.aborted||current.current!==before){setNotice('The editor changed. Request a fresh edit using your latest composition.');return;}
   if(typeof result.summary!=='string'||result.summary.length>500||!validEditorChanges(props.kind,result.changes)||(props.kind==='video'&&!validEditorTiming(props.current,result.changes as VideoEditorChanges)))throw Error('This edit is outside the supported controls. Try a more specific instruction.');
   prepared.current=before;setPlan(result);
  }catch(error){setNotice(controller.signal.aborted?'Edit cancelled. A dispatched request may still use your AI quota.':error instanceof Error?error.message:'Could not prepare the AI edit.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="editor-ai-assistant" aria-label={`AI ${props.kind} editor`}>
  <div className="editor-ai-heading"><Sparkles size={20}/><div><span>ORBIT ASSISTANT</span><h3>Describe it. Shape your edit.</h3></div></div>
  <p>Give one instruction for the layout, colours, text{props.kind==='video'?', timing and pace':''}. AI prepares editable changes for this {props.kind==='image'?'slide':'clip'}; you review and apply them together.</p>
  <label className="field">What would you like to change?<textarea aria-label={`AI ${props.kind} editing instruction`} disabled={busy||props.preview} maxLength={3000} value={instruction} onChange={e=>{setInstruction(e.target.value);setPlan(null);}} placeholder={props.kind==='image'?'Turn this into a warm product poster. Use a cream background, dark text and the headline “Made for your everyday”.':'Make a clean 10-second product reel, portrait format, with a calm pace and three short Malay captions from this brief…'}/></label>
  <div className="editor-ai-examples">{(props.kind==='image'?['Create a minimal product poster','Make it a bold sale announcement','Use a warm editorial colour palette']:['Make a cinematic portrait reel','Create a clean product showcase','Add three short captions from my brief']).map(text=><button key={text} type="button" disabled={busy||props.preview} onClick={()=>{setInstruction(text);setPlan(null);}}>{text}</button>)}</div>
  <div className="editor-ai-actions"><Button disabled={props.disabled||props.preview||busy||!instruction.trim()} onClick={()=>void generate()}><Sparkles size={16}/>{busy?'Preparing your edit…':'Prepare AI edit'}<ArrowUpRight size={16}/></Button>{busy?<Button variant="outline" onClick={()=>pending.current?.abort()}><X size={16}/>Cancel</Button>:null}</div>
  {plan?<div className="editor-ai-result"><h4>Your proposed edit</h4><p>{plan.summary}</p>{Object.keys(plan.changes).length?<><dl>{Object.entries(plan.changes).map(([key,value])=><div key={key}><dt>{key.replace(/([A-Z])/g,' $1')}</dt><dd>{Array.isArray(value)?`${value.length} timed captions`:String(value)}</dd></div>)}</dl><Button disabled={props.disabled||prepared.current!==snapshot} onClick={()=>{if(prepared.current!==current.current)return;if(props.kind==='image')props.onApply(plan.changes as ImageEditorChanges);else props.onApply(plan.changes as VideoEditorChanges);setPlan(null);setNotice('AI changes applied to your editor. Preview the result and use Undo to restore the previous edit.');}}>Apply AI edit</Button></>:<p>This request needs a different media tool. Your current edit is unchanged.</p>}</div>:null}
  <small>Only your instruction and editable settings are sent. AI does not view the media or transcribe speech here. Original files stay on this device. Generative image changes use the separate image connection. Each request uses your workspace AI quota.</small>
  {props.preview?<p>Sign in to use the AI editor.</p>:props.disabled?<p>Choose media to start an AI edit.</p>:null}
  {notice?<p role="status" className="action-notice">{notice}</p>:null}
 </section>;
}
