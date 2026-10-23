import { ProjectLibrary } from "../orbit/project-library";
export const metadata={title:"Orbit Device Projects",robots:{index:false,follow:false}};
/** Device-only files. This surface neither reads account drafts nor uploads media. */
export default function Page(){return <ProjectLibrary/>;}
