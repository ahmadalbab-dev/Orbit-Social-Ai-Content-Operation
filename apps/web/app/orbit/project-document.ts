/** Serializable source-media manifest. No credentials, object URLs or signed URLs. */
export type AssetKind = "image" | "video" | "audio";
export type ProjectAsset = { id: string; name: string; kind: AssetKind; mimeType: string; bytes: number; checksum: string };
export type MediaProject = { schemaVersion: 1; id: string; title: string; revision: number; createdAt: string; updatedAt: string; assets: ProjectAsset[] };
export const PROJECT_FILE_LIMIT = 256 * 1024 * 1024;
export const PROJECT_BYTES_LIMIT = 512 * 1024 * 1024;
const formats: Record<string, AssetKind> = { "image/png":"image", "image/jpeg":"image", "image/webp":"image", "video/mp4":"video", "video/webm":"video", "video/quicktime":"video", "audio/mpeg":"audio", "audio/wav":"audio", "audio/x-wav":"audio", "audio/ogg":"audio", "audio/mp4":"audio" };
export const projectId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function projectTitle(value: string) {
  const title=value.trim();
  if(!title || title.length>80 || /[\u0000-\u001f\u007f]/.test(title)) throw new Error("Use a project name between 1 and 80 characters.");
  return title;
}
export function projectFileKind(file: Pick<File,"type"|"size">): AssetKind {
  const kind=Object.hasOwn(formats,file.type)?formats[file.type]:undefined;
  if(!kind || !Number.isSafeInteger(file.size) || file.size<=0 || file.size>PROJECT_FILE_LIMIT) throw new Error("Choose a supported image, video or audio file up to 256 MB.");
  if(kind==="image" && file.size>8*1024*1024) throw new Error("Choose an image up to 8 MB.");
  return kind;
}
export function validateProject(value: unknown): MediaProject {
  const p=value as MediaProject;
  if(!p || p.schemaVersion!==1 || !projectId(p.id) || typeof p.title!=="string" || projectTitle(p.title)!==p.title || !Number.isSafeInteger(p.revision) || p.revision<1 || !Array.isArray(p.assets) || p.assets.length>100 || typeof p.createdAt!=="string" || typeof p.updatedAt!=="string" || !Number.isFinite(Date.parse(p.createdAt)) || !Number.isFinite(Date.parse(p.updatedAt))) throw new Error("This project cannot be opened.");
  const ids=new Set<string>();let bytes=0;
  for(const asset of p.assets){
    if(!asset || !projectId(asset.id) || ids.has(asset.id) || typeof asset.name!=="string" || !asset.name || asset.name.length>255 || /[\u0000-\u001f\u007f]/.test(asset.name) || projectFileKind({type:asset.mimeType,size:asset.bytes})!==asset.kind || !/^[0-9a-f]{64}$/.test(asset.checksum)) throw new Error("This project contains an invalid asset.");
    ids.add(asset.id);bytes+=asset.bytes;
  }
  if(bytes>PROJECT_BYTES_LIMIT) throw new Error("Use up to 512 MB of source media per project.");
  return p;
}
export function newProject(title: string): MediaProject {
  const now=new Date().toISOString();
  return {schemaVersion:1,id:crypto.randomUUID(),title:projectTitle(title),revision:1,createdAt:now,updatedAt:now,assets:[]};
}
export function appendProjectAsset(project: MediaProject, asset: ProjectAsset, expectedRevision: number): MediaProject {
  validateProject(project);
  if(project.revision!==expectedRevision) throw new Error("This project changed in another tab. Reload before importing.");
  if(project.assets.some(item=>item.checksum===asset.checksum)) return project;
  return validateProject({...project,assets:[...project.assets,asset],revision:project.revision+1,updatedAt:new Date().toISOString()});
}
