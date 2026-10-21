import { WorkspaceApp } from "../../orbit/workspace-app";
export const metadata = { title: "Orbit Video Editor", robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceApp editorKind="video"/>; }
