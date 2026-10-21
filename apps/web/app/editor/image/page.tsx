import { WorkspaceApp } from "../../orbit/workspace-app";
export const metadata = { title: "Orbit Image Editor", robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceApp editorKind="image"/>; }
