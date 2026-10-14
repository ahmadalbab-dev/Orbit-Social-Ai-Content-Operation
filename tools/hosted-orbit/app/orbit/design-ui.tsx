import type { ReactNode, ButtonHTMLAttributes } from "react";
import { ArrowUpRight, Check, Clock3, FilePenLine, CircleCheck, Radio } from "lucide-react";
export type OrbitChannel = "facebook" | "instagram" | "threads";
export function OrbitMark({ small=false }: { small?:boolean }) {
  return <svg className={small?"orbit-mark small":"orbit-mark"} viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="3"/><ellipse cx="24" cy="24" rx="22" ry="9" transform="rotate(-35 24 24)" stroke="currentColor" strokeWidth="2"/><circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="41" cy="12" r="4" fill="var(--accent)"/></svg>;
}
export function PlatformIcon({ platform, size=22 }: { platform:string; size?:number }) {
  if(platform==="facebook") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
  if(platform==="instagram") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r=".5"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/></svg>;
}
export function PlatformBadge({ platform, label=false }: { platform:string; label?:boolean }) {
  return <span className={`platform-badge ${platform}`} title={platform}><PlatformIcon platform={platform}/>{label?<span>{platform}</span>:<span className="sr-only">{platform}</span>}</span>;
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
