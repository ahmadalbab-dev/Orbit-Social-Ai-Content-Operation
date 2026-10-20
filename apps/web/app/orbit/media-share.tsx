"use client";
import {useState} from "react";
import {Download,Share2} from "lucide-react";
import {Button} from "./ui";

type ShareNavigator={canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
export type MediaShareResult="shared"|"unsupported"|"cancelled"|"failed";

/** A share handoff is not confirmation that a social post was published. */
export async function shareMediaFile(file:File,target:ShareNavigator):Promise<MediaShareResult>{
 if(!target.share||!target.canShare)return "unsupported";
 try{
  if(!target.canShare({files:[file]}))return "unsupported";
  await target.share({files:[file]});
  return "shared";
 }catch(error){
  return error instanceof Error&&error.name==="AbortError"?"cancelled":"failed";
 }
}

export function MediaShare({file,disabled=false}:{file:File|null;disabled?:boolean}){
 const [sharing,setSharing]=useState(false);
 const [notice,setNotice]=useState<{file:File;message:string}|null>(null);
 async function share(){
  if(!file||disabled||sharing)return;
  const current=file;setSharing(true);setNotice(null);
  // Called directly from this click, after export has prepared the File. Never
  // wait for rendering/encoding before opening the device's share menu.
  const result=await shareMediaFile(current,navigator);
  const message:Record<MediaShareResult,string>={
   shared:"Export handed to your device's share menu. Finish posting in the app you choose; publication is not confirmed here.",
   unsupported:"File sharing is unavailable for this export on this device. Download the file and open it in your social app.",
   cancelled:"Sharing cancelled. Your export is still ready.",
   failed:"The share menu could not complete this request. Download the file and share it from your device.",
  };
  setNotice({file:current,message:message[result]});setSharing(false);
 }
 function download(){
  if(!file||disabled)return;
  const url=URL.createObjectURL(file),link=document.createElement("a");
  link.href=url;link.download=file.name;document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 if(!file)return null;
 return <div className="media-share">
  <Button variant="outline" disabled={disabled||sharing} onClick={()=>void share()}><Share2 size={17}/>{sharing?"Sharing…":"Share export"}</Button>
  <Button variant="outline" disabled={disabled||sharing} onClick={download}><Download size={17}/>Download exported file</Button>
  <p className="review-help">Last export: {file.name}. Export again to include newer edits. Choose an available app in your device's share menu. You may need to paste your caption separately.</p>
  <p role="status" aria-live="polite">{notice?.file===file?notice.message:"Export ready to share. Your social account does not need to be connected to Orbit."}</p>
 </div>;
}
