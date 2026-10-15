const base=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001").replace(/\/$/,"");
let session:{token:string;workspaceId:string}|null=null;
export function setApiSession(next:typeof session){session=next;}
export async function api<T>(path:string,method="GET",body?:unknown,workspace=true):Promise<T>{
 const current=session;
 if(!current?.token)throw Error("Sign in to access your workspace.");
 if(workspace&&!current.workspaceId)throw Error("Choose or create a workspace first.");
 const response=await fetch(`${base}/v1${path}`,{method,cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${current.token}`,...(workspace?{"x-workspace-id":current.workspaceId}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){if(response.status===401)throw Error("Your session has expired. Sign out and sign in again.");throw Error(typeof data.message==="string"?data.message:`Request failed (${response.status}).`);}
 return data as T;
}
