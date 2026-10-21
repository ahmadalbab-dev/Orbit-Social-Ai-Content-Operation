"use client";
import {useEffect,useRef,useState} from 'react';
import {Sparkles,X,ArrowUpRight} from 'lucide-react';
import {apiResponse} from './session-api';
import {Button} from './ui';
import {validEditorChanges,validEditorTiming,type ImageEditorChanges,type ImageEditorState,type VideoEditorChanges,type VideoEditorState,type EditorPlan} from './editor-ai-contract';
import './editor-ai.css';
import {imageMotionInstruction,pixelImageInstruction,type ImageMotion} from './image-motion';
import {uploadedBackgroundPlan} from './local-editor-actions';
type Props={assetIdentity?:string;disabled:boolean;preview:boolean;source?:()=>HTMLCanvasElement|null;onOpenMusic?:()=>void;onPrepareLightning?:()=>void;onPrepareImageMotion?:(motion:ImageMotion)=>void;onOpenImageEdit?:(instruction:string)=>void}&({kind:'image';current:ImageEditorState;onApply:(changes:ImageEditorChanges)=>void}|{kind:'video';current:VideoEditorState;onApply:(changes:VideoEditorChanges)=>void});
export function EditorAiPanel(props:Props){
 const [usePreview,setUsePreview]=useState(false);
 const [instruction,setInstruction]=useState(''),[plan,setPlan]=useState<EditorPlan|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null),snapshot=JSON.stringify([props.assetIdentity,props.current]),current=useRef(snapshot),prepared=useRef('');current.current=snapshot;
 useEffect(()=>{setPlan(null);return ()=>{pending.current?.abort();};},[snapshot]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 async function generate(){
  if(busy||props.disabled||!instruction.trim())return;
  if(props.kind==='image'&&props.onPrepareImageMotion){const motion=imageMotionInstruction(instruction);if(motion){props.onPrepareImageMotion(motion);setPlan(null);setNotice('Preview local camera motion, then export an image movie. This animates existing pixels; no generated footage, upload or AI quota was used.');return;}}
  if(props.kind==='video'&&props.onPrepareLightning&&/\b(?:lightning|kilat)\b/i.test(instruction)&&/\b(?:thunder|guruh)\b/i.test(instruction)&&!/\b(?:not|never|don't|jangan|bukan)\b/i.test(instruction)){props.onPrepareLightning();setPlan(null);setNotice('Review the local lightning and thunder effect below. No AI request was sent.');return;}
  if(props.kind==='image'){const local=uploadedBackgroundPlan(instruction,props.current);if(local){prepared.current=snapshot;setPlan(local);setNotice('Prepared locally from your uploaded images. No AI request was sent.');return;}}
  if(props.onOpenMusic&&/\b(music|muzik|soundtrack|lagu)\b/i.test(instruction)&&/\b(add|insert|put|attach|tambah|masuk|masukkan|letak)\b/i.test(instruction)){props.onOpenMusic();setNotice('Choose music in Music, then export the movie with your soundtrack.');setPlan(null);return;}
  if(props.kind==='image'&&props.onOpenImageEdit&&pixelImageInstruction(instruction)){props.onOpenImageEdit(instruction);setPlan(null);setNotice('Your instruction is ready in the image generation panel. Review the provider and preview-sharing notice, then choose Edit image with AI.');return;}
  if(props.preview){setNotice('Sign in to prepare AI changes. Local image motion and uploaded-image background commands work without a provider request.');return;}
  const controller=new AbortController(),before=snapshot;pending.current=controller;setBusy(true);setNotice('');setPlan(null);
  try{
   let previewDataUrl:string|undefined;
   if(usePreview&&props.source){const source=props.source();if(!source)throw Error('The current preview is not ready. Try again after it loads.');const canvas=document.createElement('canvas'),scale=Math.min(1,768/Math.max(source.width,source.height));canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Preview is unavailable.');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);previewDataUrl=canvas.toDataURL('image/jpeg',0.72);if(previewDataUrl.length>700000)throw Error('Preview is too large. Turn off preview sharing or simplify the composition.');}
   const response=await apiResponse('/media/editor-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:props.kind,instruction:instruction.trim(),current:props.current,...(previewDataUrl?{previewDataUrl}:{})}),signal:controller.signal});
   const result=await response.json() as EditorPlan;
   if(controller.signal.aborted||current.current!==before){setNotice('The editor changed. Request a fresh edit using your latest composition.');return;}
   if(typeof result.summary!=='string'||result.summary.length>500||!validEditorChanges(props.kind,result.changes)||(props.kind==='video'&&!validEditorTiming(props.current,result.changes as VideoEditorChanges)))throw Error('This edit is outside the supported controls. Try a more specific instruction.');
   prepared.current=before;setPlan(result);
  }catch(error){setNotice(controller.signal.aborted?'Edit cancelled. A dispatched request may still use your AI quota.':error instanceof Error?error.message:'Could not prepare the AI edit.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="editor-ai-assistant" aria-label={`AI ${props.kind} editor`}>
  <div className="editor-ai-heading"><Sparkles size={20}/><div><span>ORBIT ASSISTANT</span><h3>Describe it. Shape your edit.</h3></div></div>
  <p>Give one instruction for the layout, layer positions, colours, text{props.kind==='video'?', timing and pace':''}. AI prepares editable changes for this {props.kind==='image'?'slide':'clip'}; you review and apply them together.</p>
  <label className="field">What would you like to change?<textarea aria-label={`AI ${props.kind} editing instruction`} disabled={busy} maxLength={3000} value={instruction} onChange={e=>{setInstruction(e.target.value);setPlan(null);}} placeholder={props.kind==='image'?'Turn this into a warm product poster. Use a cream background, dark text and the headline “Made for your everyday”.':'Make a clean 10-second product reel, portrait format, with a calm pace and three short Malay captions from this brief…'}/></label>
  <div className="editor-ai-examples">{(props.kind==='image'?['Create a minimal product poster','Make it a bold sale announcement','Use a warm editorial colour palette']:['Make a cinematic portrait reel','Create a clean product showcase','Add three short captions from my brief']).map(text=><button key={text} type="button" disabled={busy} onClick={()=>{setInstruction(text);setPlan(null);}}>{text}</button>)}</div>
  {props.source?<label className="editor-preview-choice"><input type="checkbox" checked={usePreview} disabled={busy||props.preview} onChange={event=>{setUsePreview(event.target.checked);setPlan(null);}}/>Use current preview with AI <small>Sends one reduced preview to Groq for visual guidance when you prepare this edit. For video, only the current frame is shared.</small></label>:null}
  <div className="editor-ai-actions"><Button disabled={props.disabled||busy||!instruction.trim()} onClick={()=>void generate()}><Sparkles size={16}/>{busy?'Preparing your edit…':'Prepare AI edit'}<ArrowUpRight size={16}/></Button>{busy?<Button variant="outline" onClick={()=>pending.current?.abort()}><X size={16}/>Cancel</Button>:null}</div>
  {plan?<div className="editor-ai-result"><h4>Your proposed edit</h4><p>{plan.summary}</p>{Object.keys(plan.changes).length?<><dl>{Object.entries(plan.changes).map(([key,value])=><div key={key}><dt>{key.replace(/([A-Z])/g,' $1')}</dt><dd>{Array.isArray(value)?`${value.length} ${key==='captions'?'timed captions':'layers'}`:String(value)}</dd></div>)}</dl><Button disabled={props.disabled||prepared.current!==snapshot} onClick={()=>{if(prepared.current!==current.current)return;if(props.kind==='image')props.onApply(plan.changes as ImageEditorChanges);else props.onApply(plan.changes as VideoEditorChanges);setPlan(null);setNotice('AI changes applied to your editor. Preview the result and use Undo to restore the previous edit.');}}>Apply AI edit</Button></>:<p>Your current edit is unchanged. Add the requested media, use the music controls, or clarify the instruction above.</p>}</div>:null}
  <small>Your instruction and editable settings are sent. If preview sharing is enabled, one reduced preview is also sent to Groq. AI does not watch the full video or transcribe speech. Original files stay on this device. Generative image changes use the separate image connection. Requests sent to an AI provider use your workspace AI quota. Supported uploaded-image background and camera-motion commands run locally without an AI request.</small>
  {props.preview?<p>Sign in for AI-provider edits. Local image motion and uploaded-image layout commands are available here.</p>:props.disabled?<p>Choose media to start an AI edit.</p>:null}
  {notice?<p role="status" className="action-notice">{notice}</p>:null}
 </section>;
}
