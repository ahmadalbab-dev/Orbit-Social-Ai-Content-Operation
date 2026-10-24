'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Check,CircleHelp,Minus,Sparkles,X} from 'lucide-react';
import {AppearanceToggle,useAppearance} from './appearance';
import {OrbitMark} from './orbit-mark';
import {pricingPlans,pricingComparison,type PricingPlan} from './pricing-plans';
import './workspace-settings.css';
import './pricing-page.css';
function PlanDetails({plan,home,onClose}:{plan:PricingPlan;home:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="pricing-dialog" aria-labelledby="plan-dialog-title" aria-describedby="plan-dialog-description" onClose={onClose} onKeyDown={event=>{if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]'));if(!controls.length)return;const current=controls.indexOf(document.activeElement as HTMLElement);event.preventDefault();controls[(current+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();}}>
  <form method="dialog"><button className="pricing-close" aria-label="Close plan details"><X size={20}/></button></form>
  <span className="pricing-eyebrow">YOUR PLAN, AT A GLANCE</span><h2 id="plan-dialog-title">{plan.name}</h2><p className="pricing-dialog-price">${plan.price}<span> USD / month</span></p>
  <p id="plan-dialog-description">This is a plan preview. Paid subscriptions are not open yet. Viewing this plan does not charge you or change your account.</p>
  <dl><div><dt>AI allowance</dt><dd>{plan.credits}</dd></div><div><dt>Video and images</dt><dd>{plan.generation}. Generation is coming soon.</dd></div><div><dt>People</dt><dd>One person. No team invitations.</dd></div></dl>
  <p className="pricing-help">Credits are shared across AI actions. The cost will be shown before generation. Advanced media generation will become selectable after launch testing.</p>
  <a className="pricing-cta" href={`${home}?view=studio`}>Explore the workspace<ArrowUpRight size={17}/></a>
 </dialog>;
}
const questions=[
 ['Can I subscribe or pay now?','Not yet. These launch plans are available to explore. Paid buttons open a plan summary; they do not start a subscription or take a payment.'],
 ['Can Free generate both an image and a video?','The proposed Free trial is one image OR one video up to six seconds, once per account. Reopening the page does not create another account allowance. Generation is not available from this pricing preview.'],
 ['What happens when my AI credits run out?','AI generation pauses until your next allowance or an explicitly purchased top-up becomes available. You can continue basic editing and exporting existing work. There are no automatic overage charges in this preview.'],
 ['Does Professional include every future feature?','It includes the full available toolkit, within stated usage limits. It does not promise unavailable integrations, unlimited generated media, cloud storage or team seats. Video generation, live music, publishing and cloud sync will show their own availability.'],
 ['Can my team share a subscription?','These $1 and $3 plans are for one person. Team invitations are not included.'],
];
export function PricingPage({preview=false}:{preview?:boolean}){
 const {motion}=useAppearance(),[selected,setSelected]=useState<PricingPlan|null>(null),home=preview?'/preview':'/';
 return <main className="orbit-shell pricing-page" data-motion={motion?'on':'paused'}>
  <header className="pricing-header"><a className="brand-word" href={home} aria-label="Orbit home"><OrbitMark small/><span>orbit<span className="word-dot">.</span></span></a><nav aria-label="Pricing navigation"><a href={home}>Workspace</a><a href={preview?'/preview/pricing':'/pricing'} aria-current="page">Pricing / Plans</a></nav><AppearanceToggle/></header>
  <section className="pricing-intro"><a className="pricing-back" href={home}><ArrowLeft size={15}/>Back to Orbit</a><p className="pricing-eyebrow">A LITTLE SPACE FOR YOUR IDEAS</p><h1>Small price.<br/><em>Room to create.</em></h1><p>Explore for free. Create a little more for $1.<br className="pricing-desktop-break"/> Find your full creative flow for $3.</p><span className="pricing-cadence">Monthly plans · USD · One person</span></section>
  <aside className="pricing-launch-note" aria-label="Plan availability"><Sparkles size={18}/><p><strong>Explore the launch plans.</strong> This page is a preview. Paid checkout is not open yet. Image and video generation are coming soon.</p></aside>
  <section className="pricing-cards" aria-label="Subscription plans">{pricingPlans.map(plan=><article key={plan.id} className={`pricing-card pricing-card-${plan.id}`} aria-labelledby={`plan-${plan.id}`}>
   <div className="pricing-card-heading"><h2 id={`plan-${plan.id}`}>{plan.name}</h2>{plan.id==='professional'?<span className="pricing-card-tag">Full toolkit</span>:null}</div>
   <p className="pricing-audience">{plan.audience}</p><p className="pricing-amount"><span>$</span>{plan.price}<small>/ month</small></p><p className="pricing-tagline">{plan.tagline}</p>
   {plan.id==='free'?<a className="pricing-cta" href={`${home}?view=studio`}>{plan.cta}<ArrowUpRight size={17}/></a>:<button className="pricing-cta" onClick={event=>{event.currentTarget.focus();setSelected(plan);}}>{plan.cta}<ArrowUpRight size={17}/></button>}
   <p className="pricing-credit-line"><Sparkles size={14}/>{plan.credits}</p><ul>{plan.features.map(feature=><li key={feature}><Check size={16}/><span>{feature}{/generation|6-second video trial/.test(feature)?<small className="pricing-soon">Coming soon</small>:null}</span></li>)}</ul>
   <div className="pricing-exclusions">{plan.excluded.map(feature=><span key={feature}><Minus size={14}/>{feature}</span>)}</div>
  </article>)}</section>
  <section className="pricing-allowance" aria-labelledby="allowance-title"><div><span className="pricing-eyebrow">CLEAR LIMITS. MORE CONFIDENCE.</span><h2 id="allowance-title">AI that fits your pace.</h2></div><div><p><strong>Free is one creative trial:</strong> choose one generated image or one video up to six seconds, once per account. It is a single choice, not one of each.</p><p><strong>Paid plans use monthly AI credits.</strong> Essential includes selected image templates and clips up to 15 seconds. Professional opens the full available toolkit with a larger allowance. Full access does not mean unlimited generation.</p><p className="pricing-help">These are proposed launch allowances. AI writing, image and video actions may use different numbers of credits. Final generation availability and credit costs will be confirmed before paid checkout opens.</p></div></section>
  <section className="pricing-comparison" aria-labelledby="compare-title"><p className="pricing-eyebrow">THE DETAILS, SIDE BY SIDE</p><h2 id="compare-title">Find your kind of creative space.</h2><div className="pricing-table-scroll" tabIndex={0} role="region" aria-label="Plan feature comparison, scroll horizontally on small screens"><table><caption className="sr-only">Free, Essential and Professional launch plan comparison</caption><thead><tr><th scope="col">What you can do</th>{pricingPlans.map(plan=><th scope="col" key={plan.id}>{plan.name}<small>${plan.price} / month</small></th>)}</tr></thead><tbody>{pricingComparison.map(row=><tr key={row.feature}><th scope="row">{row.feature}{'upcoming' in row&&row.upcoming?<small className="pricing-soon">Generation or live service availability varies</small>:null}</th>{row.values.map((value,index)=><td key={index}>{value}</td>)}</tr>)}</tbody></table></div></section>
  <section className="pricing-faq" aria-labelledby="faq-title"><div><CircleHelp size={25}/><h2 id="faq-title">A few things to know.</h2><p>A clear plan before you commit.</p></div><div>{questions.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  <footer className="pricing-footer"><a className="brand-word" href={home}>orbit<span className="word-dot">.</span></a><p>Your ideas. Your pace.</p><a href={home}>Back to workspace<ArrowUpRight size={15}/></a></footer>
  {selected?<PlanDetails key={selected.id} plan={selected} home={home} onClose={()=>setSelected(null)}/>:null}
 </main>;
}
