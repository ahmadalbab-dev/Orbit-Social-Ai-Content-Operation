"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Film, ImagePlus, Layers, Music2, Pause, Play, Sparkles } from "lucide-react";
import { useAppearance } from "./appearance";
import "./media-entry.css";

/** Local files are chosen only after entering the dedicated editor. */
export function MediaEntry({ preview = false }: { preview?: boolean }) {
  const root = preview ? "/preview/editor" : "/editor";
  return <section className="workspace-view media-entry" aria-labelledby="media-entry-title">
    <header className="media-entry-intro"><span className="media-entry-label">Your creative workspace</span><h1 id="media-entry-title">Make room for<br/><em>your next idea.</em></h1><p>One focused editor for your images. Another for your videos. Your canvas and tools, always within reach.</p></header>
    <div className="media-entry-choices">
      <article className="media-entry-choice media-entry-video"><div className="media-entry-visual"><VideoExample/></div><div className="media-entry-icon"><Film size={30} strokeWidth={1.4}/></div><div><h2>Video editor</h2><p>Shape your story with trims, image layers, captions, colour and your own music.</p><div className="media-entry-features"><span><Music2 size={15}/>Local music</span><span><Sparkles size={15}/>AI edit plans</span></div><a href={`${root}/video`} className="media-start-link">Start video editing<ArrowUpRight size={20}/></a></div></article>
      <article className="media-entry-choice media-entry-image"><div className="media-entry-visual"><ImageExample/></div><div className="media-entry-icon"><ImagePlus size={30} strokeWidth={1.4}/></div><div><h2>Image editor</h2><p>Arrange your photos, add text and layers, then export an image, carousel or music movie.</p><div className="media-entry-features"><span><Layers size={15}/>Photo layers</span><span><Sparkles size={15}/>AI edit plans</span></div><a href={`${root}/image`} className="media-start-link">Start image editing<ArrowUpRight size={20}/></a></div></article>
    </div>
    <section className="media-how" aria-labelledby="media-how-title"><h2 id="media-how-title">How it works</h2><ol><li><strong>Choose your editor</strong><p>Open a separate workspace made for images or video.</p></li><li><strong>Bring your media</strong><p>Choose files from your device. Select a tool to adjust your canvas.</p></li><li><strong>Review and export</strong><p>Preview every change, then download the finished file.</p></li></ol><p className="media-privacy">Files stay on your device during local editing. AI preview and cloud actions ask you to send media separately. {preview ? "Sign in to use workspace AI and cloud services." : "Keep the editor open until your export finishes."}</p></section>
  </section>;
}

/** Original four-second motion study. Playback stays local and stops off screen. */
function VideoExample() {
 const video=useRef<HTMLVideoElement>(null),stage=useRef<HTMLDivElement>(null),playhead=useRef<HTMLSpanElement>(null);
 const {motion}=useAppearance();
 const requested=useRef(motion),[playing,setPlaying]=useState(false);
 useEffect(()=>{
  const player=video.current,container=stage.current;if(!player||!container)return;
  requested.current=motion;let visible=false;
  const sync=()=>{if(requested.current&&visible&&!document.hidden)void player.play().catch(()=>{});else player.pause();};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.2});
  observer.observe(container);document.addEventListener("visibilitychange",sync);sync();
  return()=>{observer.disconnect();document.removeEventListener("visibilitychange",sync);player.pause();};
 },[motion]);
 function toggle(){const player=video.current;if(!player)return;if(player.paused){requested.current=true;void player.play().catch(()=>{});}else{requested.current=false;player.pause();}}
 return <div className="media-video-example" ref={stage}>
  <div className="media-demo-bar"><span>VIDEO WORKSPACE</span><span>Muted example</span></div>
  <div className="media-demo-screen"><video ref={video} src="/media/orbit-motion-example.mp4" poster="/media/orbit-motion-example.webp" width={640} height={360} muted loop playsInline preload="metadata" aria-label="Original four-second motion example" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={()=>{const player=video.current;if(player&&playhead.current)playhead.current.style.transform=`scaleX(${player.duration?player.currentTime/player.duration:0})`;}}/><button type="button" className="media-example-play" aria-label={playing?"Pause video example":"Play video example"} onClick={toggle}>{playing?<Pause size={17} strokeWidth={1.5}/>:<Play size={17} strokeWidth={1.5}/>}</button></div>
  <div className="media-demo-timeline" aria-hidden="true"><div className="media-demo-filmstrip">{[0,1,2,3].map(frame=><img key={frame} src="/media/orbit-motion-example.webp" alt=""/>)}</div><span ref={playhead} className="media-demo-playhead"/><span className="media-demo-duration">Motion clip · 4 s</span></div>
 </div>;
}
function ImageExample(){return <div className="media-image-example" role="img" aria-label="Image composition example: a layered ceramic product poster with an editable photo frame and headline">
 <div className="media-demo-bar"><span>IMAGE WORKSPACE</span><span>Composition example</span></div>
 <div className="media-demo-poster"><div className="media-demo-poster-copy"><small>THE EVERYDAY EDIT</small><strong>Still.<br/><em>Something<br/>beautiful.</em></strong><span>Made with intention.</span></div><div className="media-demo-photo-layer"><img src="/media/orbit-creative-still.webp" alt="" width={1672} height={941}/><i/><i/><i/><i/></div><span className="media-demo-poster-label">CERAMICS / 01</span></div>
 <div className="media-demo-layer-strip"><span><Layers size={13} strokeWidth={1.5}/>Photo layer</span><span>Headline</span><span>Background</span></div>
 </div>;}
