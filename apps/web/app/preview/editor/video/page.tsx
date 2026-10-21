import { EditorWorkspace } from "../../../orbit/editor-workspace";
export const metadata = { title: "Orbit Video Editor", robots: { index: false, follow: false } };
export default function Page() { return <EditorWorkspace kind="video" preview/>; }
