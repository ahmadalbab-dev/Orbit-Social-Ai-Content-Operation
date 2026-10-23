import { appendProjectAsset, newProject, projectFileKind, projectId, validateProject, type MediaProject, type ProjectAsset } from "./project-document";

// Explicit device library, separate from server MediaAsset IDs and account drafts.
// Originals are byte records; runtime object URLs never enter the manifest.
const DB="orbit-device-projects-v1";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore("projects",{keyPath:"id"});db.createObjectStore("files");};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error("Device storage is unavailable. Check your browser storage settings."));
    request.onblocked=()=>reject(new Error("Close other Orbit tabs, then try again."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction, result: (value:T)=>void, abort:(error:unknown)=>void)=>void): Promise<T> {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(["projects","files"],mode);let output:T;let failure:unknown;
    const fail=()=>{db.close();reject(failure??new Error(tx.error?.name==="QuotaExceededError"?"Device storage is full. Free some space before importing.":"The project could not be stored. Check your browser storage settings and try again."));};
    tx.oncomplete=()=>{db.close();resolve(output);};tx.onabort=fail;
    const abort=(error:unknown)=>{failure=error;tx.abort();};
    try{run(tx,value=>{output=value;},abort);}catch(error){abort(error);}
  });
}
export async function listProjects(): Promise<MediaProject[]> {
  return transaction("readonly",(tx,result)=>{const r=tx.objectStore("projects").getAll();r.onsuccess=()=>{try{result(r.result.map(validateProject).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}catch{tx.abort();}};});
}
export async function createProject(title: string): Promise<MediaProject> {
  const project=newProject(title);
  return transaction("readwrite",(tx,result)=>{const store=tx.objectStore("projects"),r=store.count();r.onsuccess=()=>{if(r.result>=100){tx.abort();return;}store.add(project);result(project);};});
}
export async function importProjectFile(id: string, expectedRevision: number, file: File): Promise<MediaProject> {
  if(!projectId(id)) throw new Error("Choose a project first.");
  const kind=projectFileKind(file),name=file.name.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,255)||"Untitled media";
  const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",bytes);
  const checksum=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
  const asset: ProjectAsset={id:crypto.randomUUID(),name,kind,mimeType:file.type,bytes:file.size,checksum};
  return transaction("readwrite",(tx,result,abort)=>{
    const store=tx.objectStore("projects"),request=store.get(id);
    request.onsuccess=()=>{try{
      const current=validateProject(request.result),next=appendProjectAsset(current,asset,expectedRevision);
      // Windows WebKit cannot prepare Blob/File IDB records. ArrayBuffer keeps
      // the original bytes and uses the same atomic transaction on every engine.
      if(next!==current){tx.objectStore("files").add({data:bytes,mimeType:file.type},[id,asset.id]);store.put(next);}result(next);
    }catch(error){abort(error);}};
  });
}
export async function projectSource(id: string, assetId: string): Promise<File> {
  if(!projectId(id)||!projectId(assetId)) throw new Error("This media link is invalid.");
  return transaction("readonly",(tx,result)=>{
    const projectRequest=tx.objectStore("projects").get(id),fileRequest=tx.objectStore("files").get([id,assetId]);
    let projectReady=false,fileReady=false;
    const finish=()=>{if(!projectReady||!fileReady)return;try{
      const p=validateProject(projectRequest.result),asset=p.assets.find(item=>item.id===assetId),stored=fileRequest.result;
      const blob=stored instanceof Blob?stored:stored?.data instanceof ArrayBuffer?new Blob([stored.data],{type:stored.mimeType}):null;
      if(!asset||!(blob instanceof Blob)||blob.size!==asset.bytes||blob.type!==asset.mimeType)throw new Error();
      result(new File([blob],asset.name,{type:asset.mimeType}));
    }catch{tx.abort();}};
    projectRequest.onsuccess=()=>{projectReady=true;finish();};fileRequest.onsuccess=()=>{fileReady=true;finish();};
  });
}
export async function deleteProject(project: MediaProject): Promise<void> {
  return transaction("readwrite",(tx,result)=>{const store=tx.objectStore("projects"),request=store.get(project.id);request.onsuccess=()=>{
    try{const current=validateProject(request.result);if(current.revision!==project.revision)throw new Error();for(const asset of current.assets)tx.objectStore("files").delete([current.id,asset.id]);store.delete(current.id);result();}catch{tx.abort();}
  };});
}
