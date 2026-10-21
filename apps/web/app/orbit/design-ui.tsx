import type { ReactNode, ButtonHTMLAttributes } from "react";
import { ArrowUpRight, Check, Clock3, FilePenLine, CircleCheck, Radio } from "lucide-react";
export type OrbitChannel = "facebook" | "instagram" | "threads" | "tiktok";
export function OrbitMark({ small=false }: { small?:boolean }) {
  return <svg className={small?"orbit-mark small":"orbit-mark"} viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="3"/><ellipse cx="24" cy="24" rx="22" ry="9" transform="rotate(-35 24 24)" stroke="currentColor" strokeWidth="2"/><circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="41" cy="12" r="4" fill="var(--accent)"/></svg>;
}
export function PlatformIcon({ platform, size=22 }: { platform:string; size?:number }) {
  const supported=["facebook","instagram","threads","tiktok"].includes(platform);
  if(!supported)return <span aria-hidden="true" style={{width:size,height:size,display:"inline-grid",placeItems:"center"}}>?</span>;
  return <img className={`platform-icon platform-icon-${platform}`} src={`/social/${platform}.${platform === "tiktok" ? "png" : "svg"}`} width={size} height={size} alt="" aria-hidden="true"/>;
}
export function PlatformBadge({ platform, label=false }: { platform:string; label?:boolean }) {
  return <span className={`platform-badge ${platform}`} title={platform}><PlatformIcon platform={platform} size={26}/>{label?<span>{platform}</span>:<span className="sr-only">{platform}</span>}</span>;
}
export function IconButton({ label, children, className="", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {label:string;children:ReactNode}) {
  return <button {...props} className={`icon-button ${className}`} aria-label={label} title={label}>{children}</button>;
}
export function SectionHeading({ number, label, title, action }: {number:string;label:string;title:string;action?:ReactNode}) {
  return <div className="section-heading"><div className="section-index"><span>{number}</span>{label}</div><h1>{title}<span className="cursor-mark" aria-hidden="true"/></h1>{action?<div className="heading-action">{action}</div>:null}</div>;
}
export function StatusBadge({ status }: {status:string}) {
  const Icon=status==="SCHEDULED"?Clock3:status==="APPROVED"?CircleCheck:status==="SIMULATED"?Check:status==="DRAFT"?FilePenLine:Radio;
  const labels:Record<string,string>={DRAFT:"Draft",APPROVED:"Approved",SCHEDULED:"Scheduled",SIMULATED:"Simulated",SIMULATION_FAILED:"Failed",SIMULATING:"Simulating"};
  return <span className={`status-badge ${status.toLowerCase()}`}><Icon size={14} aria-hidden="true"/>{labels[status]??status}</span>;
}
export function EmptyState({ icon, title, children, action }: {icon:ReactNode;title:string;children?:ReactNode;action?:ReactNode}) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">{icon}</div><h2>{title}</h2>{children?<p>{children}</p>:null}{action}</div>;
}
export function ToolLink({ icon,title,onClick,tone="mint" }: {icon:ReactNode;title:string;onClick:()=>void;tone?:string}) {
  return <button className={`tool-link ${tone}`} onClick={onClick}><span className="tool-icon" aria-hidden="true">{icon}</span><span>{title}</span><ArrowUpRight size={20} aria-hidden="true"/></button>;
}
