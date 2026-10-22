"use client";
import {useEffect,useRef,useState} from "react";
import {ExternalLink,Info,Link2,RefreshCw,ShieldCheck,X} from "lucide-react";
import {Card} from "./ui";
import {PlatformIcon,SectionHeading} from "./design-ui";
import {api} from "./session-api";
import {socialOAuthAuthorization} from "./social-oauth";
import "./connections-panel.css";
type PublishingCapability={implemented:boolean;canPublishText:boolean;canPublishImage:boolean;canPublishVideo:boolean;reason:string;missingScopes?:string[]};
export type IntegrationStatus={connectorMode?:string;livePublishing?:boolean;providers:Record<string,{configured?:boolean;credentialsConfigured?:boolean;connected?:boolean;oauthImplemented?:boolean;reason?:string;publishing?:PublishingCapability;accounts?:{name:string;accountType:string|null;publishing?:PublishingCapability}[]}>};
const providers=[
 {id:"facebook",name:"Facebook",account:"Facebook Pages",docs:"https://developers.facebook.com/docs/pages-api/getting-started/",requirement:"Choose a Facebook Page you are authorised to manage. Facebook will show the permissions requested by Orbit."},
 {id:"instagram",name:"Instagram",account:"Business + Creator",docs:"https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/",requirement:"Connect your Instagram professional account (Business or Creator) linked to a Facebook Page you manage. Facebook will show the permissions requested by Orbit."},
 {id:"threads",name:"Threads",account:"Threads profiles",docs:"https://developers.facebook.com/docs/threads/get-started/",requirement:"Connect your Threads profile. Threads will show the permissions requested by Orbit."},
 {id:"tiktok",name:"TikTok",account:"TikTok profiles",docs:"https://developers.tiktok.com/docs/en/login-kit-web",requirement:"Connect your TikTok profile through TikTok Login Kit. Basic profile access only; reconnect when the 24-hour token expires. Automatic publishing and token refresh are off."},
] as const;
export function ConnectionsPanel({status,preview=false}:{status:IntegrationStatus|null;preview?:boolean}) {
 const [selected,setSelected]=useState<typeof providers[number]|null>(null),[latest,setLatest]=useState(status),[checking,setChecking]=useState(false),[authorizing,setAuthorizing]=useState(false),[notice,setNotice]=useState("");
 const dialog=useRef<HTMLDialogElement>(null),operation=useRef(0),callbackHandled=useRef(false);
 useEffect(()=>setLatest(status),[status]);
 useEffect(()=>{if(selected&&!dialog.current?.open)dialog.current?.showModal();},[selected]);
 useEffect(()=>{
  if(preview||callbackHandled.current)return;
  const query=new URLSearchParams(window.location.search),result=query.get("oauth"),item=providers.find(provider=>provider.id===query.get("provider"));
  if(!item||(result!=="connected"&&result!=="failed"))return;
  callbackHandled.current=true;
  // The callback carries no credentials. Its query is only a prompt to recheck the workspace.
  query.delete("oauth");query.delete("provider");query.set("view","connections");
  window.history.replaceState(null,"",`${window.location.pathname}${query.size?`?${query}`:""}${window.location.hash}`);
  const current=operation.current;
  setSelected(item);setChecking(true);
  void api<IntegrationStatus>("/integrations/status").then(next=>{
   if(current!==operation.current)return;
   setLatest(next);
   setNotice(result==="connected"&&next.providers[item.id]?.connected?`${item.name} is connected to this workspace. Live publishing remains off.`:result==="failed"?`${item.name} authorisation was not completed. Your existing workspace connections are unchanged. You can try again.`:"Authorisation returned, but this workspace has not confirmed the account yet. Refresh its status before trying again.");
  }).catch(()=>{if(current===operation.current)setNotice("Authorisation returned, but the workspace connection could not be checked. Refresh its status to verify the account.");}).finally(()=>{if(current===operation.current)setChecking(false);});
 },[preview]);
 const provider=selected?latest?.providers[selected.id]:undefined;
 const ready=!!provider?.configured&&!!provider?.oauthImplemented;
 async function refresh(){
  if(preview){setNotice("Sign in to check your workspace connection setup.");return;}
  const current=operation.current;setChecking(true);
  try{const next=await api<IntegrationStatus>("/integrations/status");if(current===operation.current){setLatest(next);setNotice("Connection status refreshed from your workspace.");}}
  catch{if(current===operation.current)setNotice("Connection status could not be checked. Check your session and retry.");}
  finally{if(current===operation.current)setChecking(false);}
 }
 async function authorize(){
  if(!selected||preview||!ready||authorizing||checking)return;
  const current=++operation.current;setAuthorizing(true);setNotice("");
  try{
   const response=await api<{authorizationUrl:string;expiresAt:string}>(`/integrations/oauth/${selected.id}/start`,"POST",{});
   if(current!==operation.current)return;
   const destination=socialOAuthAuthorization(response.authorizationUrl,selected.id);
   window.location.assign(destination);
  }catch(error){if(current===operation.current)setNotice(error instanceof Error?error.message:"The account connection could not be opened. Refresh its status and try again.");}
  finally{if(current===operation.current)setAuthorizing(false);}
 }
 function close(){operation.current++;dialog.current?.close();setSelected(null);setNotice("");setChecking(false);setAuthorizing(false);}
 return <section className="workspace-view">
  <SectionHeading number="04" label="Channels" title="One workspace. Your channels."/>
  <div className="connection-grid">{providers.map(item=>{const state=latest?.providers[item.id];return <Card key={item.id} className={`surface connection-card ${item.id}`}>
   <div className="connection-icon"><PlatformIcon platform={item.id} size={44}/></div><h2>{item.name}</h2>
   <span className="connection-state"><span/>{state?.connected?"Connected":preview?"Preview only":state?.configured&&state?.oauthImplemented?"Ready to connect":latest?"Setup required":"Status unavailable"}</span><p>{item.account}</p>
   <button className="text-action" aria-label={`${state?.connected?"Manage":"Connect"} ${item.id}`} onClick={()=>setSelected(item)}><Link2 size={16}/>{state?.connected?"Manage connection":"Connect account"}</button>
   <small>{state?.accounts?.map(account=>`${account.name} · ${account.accountType??"Account"}`).join(", ")||"Owner authorisation required"}</small>
  </Card>;})}</div>
  <div className="numbered-section"><div className="section-index"><span>01</span>Connection setup</div><div className="connection-setup"><h2>Your accounts stay yours.</h2><p>Connect through the official provider authorisation screen. You choose the account and review its permissions.</p><p className="action-notice"><Info size={15}/>Live publishing is off. You can continue creating, exporting and recording schedules.</p></div></div>
  <dialog ref={dialog} className="connection-dialog" aria-labelledby="connection-title" aria-describedby="connection-description" onCancel={event=>{event.preventDefault();close();}} onClose={()=>setSelected(null)}>{selected?<>
   <header><div className="panel-label"><PlatformIcon platform={selected.id} size={30}/><h2 id="connection-title">{provider?.connected?"Manage":"Connect"} {selected.name}</h2></div><button className="icon-button" aria-label="Close connection setup" onClick={close}><X size={20}/></button></header>
   <p id="connection-description">{selected.requirement}</p>
   <div className="connection-blocker" role="note"><ShieldCheck size={20}/><div><strong>{preview?"Sign in to a workspace":provider?.connected?"Account connected":ready?"Ready for your authorisation":"Owner setup required"}</strong><p>{preview?"This is a design preview. No social account will be authorised here.":provider?.connected?"The account is saved in this workspace. Reconnect if its permissions have changed. Connecting does not publish any content.":ready?`Continue to ${selected.name} to authorise your account, then return here to verify the connection. Connecting does not publish any content.`:provider?.oauthImplemented?"The workspace operator needs to finish this provider's app configuration before accounts can be connected.":"Orbit's social OAuth authorisation flow is not enabled in this deployment. The workspace operator must finish the provider integration before customers can connect."}</p></div></div>
   <dl className="connection-diagnostics"><div><dt>Workspace status</dt><dd>{preview?"Preview":latest?"Checked":"Unavailable"}</dd></div><div><dt>Owner authorisation</dt><dd>{provider?.connected?"Connected":"Required"}</dd></div><div><dt>Authorisation flow</dt><dd>{provider?.oauthImplemented?ready?"Ready":"App configuration required":"Not enabled"}</dd></div><div><dt>Automatic publishing</dt><dd>{latest?.livePublishing?"Available":"Off"}</dd></div></dl>
   {!preview&&provider?.publishing?<section aria-label="Publishing capability"><h3>Posting from Orbit</h3>{provider.accounts?.length?<ul>{provider.accounts.map((account,index)=><li key={index}><strong>{account.name}</strong><p>{account.publishing?.reason??provider.publishing!.reason}</p></li>)}</ul>:<p>{provider.publishing.reason}</p>}</section>:null}
   {!preview&&ready?<button className="connection-authorize" disabled={checking||authorizing} onClick={()=>void authorize()}><Link2 size={18}/>{authorizing?"Opening authorisation…":provider?.connected?`Reconnect ${selected.name}`:`Continue with ${selected.name}`}</button>:null}
   {!ready?<details className="small-details"><summary>What the workspace operator needs to finish</summary><ol><li>Configure the appropriate developer app and API product for this provider.</li><li>Register the exact HTTPS callback URL and configure app credentials securely on the server.</li><li>Complete any required app review, then return here for account owner authorisation.</li></ol><p>Do not paste account passwords, app secrets or access tokens here.</p></details>:null}
   <div className="connection-dialog-actions"><button className="text-action" disabled={checking||authorizing} onClick={()=>void refresh()}><RefreshCw size={16}/>{checking?"Checking…":"Refresh connection status"}</button>{!ready?<a className="text-action" href={selected.docs} target="_blank" rel="noreferrer">Official {selected.name} setup<ExternalLink size={16}/></a>:null}</div>
   {notice?<p role="status" className="action-notice">{notice}</p>:null}
  </>:null}</dialog>
 </section>;
}
