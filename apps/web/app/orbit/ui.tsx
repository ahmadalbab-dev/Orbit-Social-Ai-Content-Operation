import type {ButtonHTMLAttributes,HTMLAttributes} from "react";
export const cn=(...values:(string|undefined|false)[])=>values.filter(Boolean).join(" ");
export function Button({className,variant="default",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"default"|"outline"|"ghost"}){return <button {...props} className={cn("orbit-button",`orbit-button-${variant}`,className)}/>;}
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm",className)}/>;}
