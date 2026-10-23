"use client";
import { useEffect, useState } from "react";
import { projectSource } from "./project-store";
import { projectFileKind } from "./project-document";
import { ArrowLeft } from "lucide-react";
import { OrbitMark } from "./design-ui";
import { AppearanceToggle } from "./appearance";
import { ImageEditor } from "./image-editor";
import { VideoEditor } from "./video-editor";
import "./workspace-navigation.css";
import "./editor-workspace.css";

export function EditorWorkspace({ kind, preview = false, workspaceName = "Your workspace" }: { kind: "image" | "video"; preview?: boolean; workspaceName?: string }) {
  const [initialFile,setInitialFile]=useState<File|null>(null),[sourceReady,setSourceReady]=useState(false),[sourceError,setSourceError]=useState("");
  useEffect(()=>{let active=true;const params=new URLSearchParams(window.location.search),project=params.get("project"),asset=params.get("asset");
    if(!project&&!asset){setSourceReady(true);return;}
    void projectSource(project??"",asset??"").then(file=>{if(projectFileKind(file)!==kind)throw new Error("Choose a source matching this editor.");if(active){setInitialFile(file);setSourceReady(true);}}).catch(()=>{if(active){setSourceError("This project source could not be opened. Return to Projects and import it again.");setSourceReady(true);}});return()=>{active=false;};
  },[kind]);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, []);
  return <main className="orbit-shell editor-workspace" data-editor-kind={kind} aria-label={`${kind === "image" ? "Image" : "Video"} editor workspace`}>
    <header className="editor-workspace-header"><a className="editor-back" href={`${preview ? "/preview" : "/"}?view=video`}><ArrowLeft size={19}/><span>Back to media</span></a><div className="editor-workspace-title"><OrbitMark small/><div><strong>{kind === "image" ? "Image editor" : "Video editor"}</strong><span>{preview ? "Local preview" : workspaceName}</span></div></div><AppearanceToggle/></header>
    {!sourceReady?<p role="status">Opening project source…</p>:sourceError?<p role="alert">{sourceError} <a href="/preview/projects">Projects</a></p>:kind === "image" ? <ImageEditor preview={preview} initialFile={initialFile}/> : <VideoEditor preview={preview} initialFile={initialFile}/>}
  </main>;
}
