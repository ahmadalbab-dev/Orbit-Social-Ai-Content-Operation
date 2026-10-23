import { describe, expect, it } from "vitest";
import { appendProjectAsset, newProject, projectFileKind, validateProject, type ProjectAsset } from "./project-document";
const asset=():ProjectAsset=>({id:crypto.randomUUID(),name:"source.png",kind:"image",mimeType:"image/png",bytes:1024,checksum:"a".repeat(64)});
describe("device project manifest",()=>{
  it("keeps source identity stable across a revision and JSON reload",()=>{const p=newProject("  Launch  "),a=asset(),next=appendProjectAsset(p,a,1);expect(p.assets).toHaveLength(0);expect(next.revision).toBe(2);expect(validateProject(JSON.parse(JSON.stringify(next))).assets[0]).toEqual(a);expect(next.title).toBe("Launch");});
  it("rejects stale imports instead of overwriting another tab",()=>{const p=appendProjectAsset(newProject("Draft"),asset(),1);expect(()=>appendProjectAsset(p,asset(),1)).toThrow("another tab");});
  it("deduplicates identical source bytes without incrementing revision",()=>{const p=appendProjectAsset(newProject("Draft"),asset(),1);expect(appendProjectAsset(p,asset(),2)).toBe(p);});
  it("bounds image memory and excludes active formats",()=>{expect(()=>projectFileKind({type:"image/svg+xml",size:100})).toThrow();expect(()=>projectFileKind({type:"image/png",size:9*1024*1024})).toThrow();expect(()=>projectFileKind({type:"video/mp4",size:257*1024*1024})).toThrow();});
  it("rejects corrupt asset kind, duplicate IDs and unknown schema",()=>{const p=newProject("Draft"),a=asset();expect(()=>validateProject({...p,schemaVersion:2})).toThrow();expect(()=>validateProject({...p,assets:[{...a,kind:"video"}]})).toThrow();expect(()=>validateProject({...p,assets:[a,a]})).toThrow();});
  it("bounds aggregate source storage",()=>{const p=newProject("Draft");expect(()=>validateProject({...p,assets:[0,1,2].map(n=>({...asset(),name:`${n}.mp4`,kind:"video",mimeType:"video/mp4",bytes:256*1024*1024}))})).toThrow("512 MB");});
});
