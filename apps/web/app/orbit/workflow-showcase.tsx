"use client";
import {useId,useState} from "react";
import {ArrowUpRight,Check,Copy,Code2} from "lucide-react";
import {IconButton} from "./design-ui";
const workflows=[
 {id:"content",label:"Content",file:"content.workflow",target:"studio" as const,action:"Open studio",description:"Start with an idea, prepare a caption for each channel, then review the draft before recording a schedule.",steps:["Idea","Draft","Review","Calendar"],lines:[
  '// Orbit workflow · illustrative, not an executable API',
  'const channels = ["facebook", "instagram", "threads"];',
  '',
  'idea("Kerja kosong di sekitar Kuala Lumpur")',
  '  → draft({ channels, voice: "Santai & bersahaja" })',
  '  → editCaption({ perChannel: true })',
  '  → review({ approval: "required" })',
  '  → calendar({ timezone: "Asia/Kuala_Lumpur" });',
  '',
  '// Drafts and planned dates are saved in your workspace.',
  '// Live publishing is not enabled.',
 ]},
 {id:"media",label:"Media",file:"media.workflow",target:"video" as const,action:"Open media",description:"Prepare an image or a video using the same media workspace, then bring the finished asset into your content process.",steps:["Upload","Edit","Preview","Export"],lines:[
  '// Image + video · one media workspace',
  'image.upload("photo.jpg")',
  '  → crop({ ratio: "1:1" })',
  '  → adjust({ colour, rotation, caption })',
  '  → export({ format: "PNG or JPEG" });',
  '',
  'video.upload("clip.mp4")',
  '  → template("News report")',
  '  → title({ date: "above", panel: "transparent" })',
  '  → preview()',
  '  → exportSettings(); // MP4 rendered separately',
 ]},
 {id:"accounts",label:"Channels",file:"channels.workflow",target:"connections" as const,action:"Open channels",description:"Account authorization uses each platform’s official consent screen. The complete publishing flow remains a planned capability.",steps:["Connect","Consent","Accounts","Review"],lines:[
  '// Account authorization · official provider consent',
  'connect("Facebook + Instagram")',
  '  → providerConsent("Meta")',
  '  → callback({ validateState: true })',
  '  → accounts({ tokens: "encrypted on server" });',
  '',
  'connect("Threads") → separateConsent();',
  '',
  '// Planned publishing flow, currently unavailable:',
  'approvedPost → scheduledPublish → checkResult;',
  '// Live posting remains off in this preview.',
 ]},
];
export function WorkflowShowcase({go}:{go:(view:"studio"|"video"|"connections")=>void}){
 const [active,setActive]=useState(0),[copied,setCopied]=useState(false),[notice,setNotice]=useState("");
 const id=useId(),workflow=workflows[active];
 async function copy(){try{await navigator.clipboard.writeText(workflow.lines.join("\n"));setCopied(true);setNotice("Workflow copied.");}catch{setNotice("Copy is unavailable. Select the workflow text to copy it.");}}
 return <section className="numbered-section workflow-showcase" aria-labelledby={`${id}-heading`}><div className="section-index"><span>04</span>Inside Orbit</div><div className="workflow-showcase-body"><h2 id={`${id}-heading`}>One idea.<br/><em>A clear workflow.</em></h2><p className="workflow-lead">See how your content moves through Orbit.</p><div className="workflow-code-tabs" aria-label="Workflow examples">{workflows.map((item,index)=><button key={item.id} type="button" aria-pressed={active===index} aria-controls={`${id}-panel`} onClick={()=>{setActive(index);setCopied(false);setNotice("");}}>{item.label}</button>)}</div><div className="workflow-code-panel" id={`${id}-panel`}><div className="workflow-code-header"><span><Code2 size={17} aria-hidden="true"/>{workflow.file}</span><IconButton label="Copy workflow" onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>}</IconButton></div><pre tabIndex={0} aria-label={`${workflow.label} workflow example`}><code>{workflow.lines.map((line,index)=><span className={`workflow-code-line ${line.startsWith("//")||line.startsWith("  //")?"code-comment":""}`} key={index}><span className="code-line-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span><span>{line||" "}</span>{"\n"}</span>)}</code></pre><div className="workflow-code-footer"><span className="workflow-indicator" aria-hidden="true"/>Workflow example<span>Workflow guide</span></div></div><ol className="workflow-stages" aria-label={`${workflow.label} stages`}>{workflow.steps.map((step,index)=><li key={step}><span>{String(index+1).padStart(2,"0")}</span>{step}</li>)}</ol><p className="workflow-explanation">{workflow.description}</p><button className="text-action" type="button" onClick={()=>go(workflow.target)}>{workflow.action}<ArrowUpRight size={17} aria-hidden="true"/></button><p className="workflow-copy-notice" role="status">{notice}</p></div></section>;
}
