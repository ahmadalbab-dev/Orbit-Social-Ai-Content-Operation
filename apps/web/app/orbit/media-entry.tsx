"use client";
import { ArrowUpRight, Film, ImagePlus, Layers, Music2, Sparkles } from "lucide-react";
import "./media-entry.css";

/** Local files are chosen only after entering the dedicated editor. */
export function MediaEntry({ preview = false }: { preview?: boolean }) {
  const root = preview ? "/preview/editor" : "/editor";
  return <section className="workspace-view media-entry" aria-labelledby="media-entry-title">
    <header className="media-entry-intro"><span className="media-entry-label">Your creative workspace</span><h1 id="media-entry-title">Make room for<br/><em>your next idea.</em></h1><p>One focused editor for your images. Another for your videos. Your canvas and tools, always within reach.</p></header>
    <div className="media-entry-choices">
      <article className="media-entry-choice media-entry-video"><div className="media-entry-visual"><img src="/media/orbit-creative-still.webp" alt="Ceramic vase and bowl arranged with violet ribbon in a sunlit studio" width="1672" height="941" decoding="async"/></div><div className="media-entry-icon"><Film size={30} strokeWidth={1.4}/></div><div><h2>Video editor</h2><p>Shape your story with trims, image layers, captions, colour and your own music.</p><div className="media-entry-features"><span><Music2 size={15}/>Local music</span><span><Sparkles size={15}/>AI edit plans</span></div><a href={`${root}/video`} className="media-start-link">Start video editing<ArrowUpRight size={20}/></a></div></article>
      <article className="media-entry-choice media-entry-image"><div className="media-entry-visual"><img src="/media/orbit-creative-still.webp" alt="Close view of a ceramic loop-handled vase with violet ribbon" width="1672" height="941" decoding="async" loading="lazy"/></div><div className="media-entry-icon"><ImagePlus size={30} strokeWidth={1.4}/></div><div><h2>Image editor</h2><p>Arrange your photos, add text and layers, then export an image, carousel or music movie.</p><div className="media-entry-features"><span><Layers size={15}/>Photo layers</span><span><Sparkles size={15}/>AI edit plans</span></div><a href={`${root}/image`} className="media-start-link">Start image editing<ArrowUpRight size={20}/></a></div></article>
    </div>
    <section className="media-how" aria-labelledby="media-how-title"><h2 id="media-how-title">How it works</h2><ol><li><strong>Choose your editor</strong><p>Open a separate workspace made for images or video.</p></li><li><strong>Bring your media</strong><p>Choose files from your device. Select a tool to adjust your canvas.</p></li><li><strong>Review and export</strong><p>Preview every change, then download the finished file.</p></li></ol><p className="media-privacy">Files stay on your device during local editing. AI preview and cloud actions ask you to send media separately. {preview ? "Sign in to use workspace AI and cloud services." : "Keep the editor open until your export finishes."}</p></section>
  </section>;
}
