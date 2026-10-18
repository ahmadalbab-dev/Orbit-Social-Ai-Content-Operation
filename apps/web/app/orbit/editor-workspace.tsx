"use client";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { OrbitMark } from "./design-ui";
import { AppearanceToggle } from "./appearance";
import { ImageEditor } from "./image-editor";
import { VideoEditor } from "./video-editor";
import "./workspace-navigation.css";
import "./editor-workspace.css";

export function EditorWorkspace({ kind, preview = false, workspaceName = "Your workspace" }: { kind: "image" | "video"; preview?: boolean; workspaceName?: string }) {
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, []);
  return <main className="orbit-shell editor-workspace" data-editor-kind={kind} aria-label={`${kind === "image" ? "Image" : "Video"} editor workspace`}>
    <header className="editor-workspace-header"><a className="editor-back" href={`${preview ? "/preview" : "/"}?view=video`}><ArrowLeft size={19}/><span>Back to media</span></a><div className="editor-workspace-title"><OrbitMark small/><div><strong>{kind === "image" ? "Image editor" : "Video editor"}</strong><span>{preview ? "Local preview" : workspaceName}</span></div></div><AppearanceToggle/></header>
    {kind === "image" ? <ImageEditor preview={preview}/> : <VideoEditor preview={preview}/>}
  </main>;
}
