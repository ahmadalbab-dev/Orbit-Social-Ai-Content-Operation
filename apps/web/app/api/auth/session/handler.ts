import { publicAuthConfig } from '../../../orbit/auth-client';
const cookieName='orbit-refresh';
const baseHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Vary':'Cookie, Origin'};
function cookie(value:string,secure:boolean){return `${cookieName}=${encodeURIComponent(value)}; Path=/api/auth/session; HttpOnly; SameSite=Strict; Max-Age=${value?2592000:0}${secure?'; Secure':''}`;}
export async function handleSession(request:Request,config=publicAuthConfig(),fetcher:typeof fetch=fetch){
 const secure=new URL(request.url).protocol==='https:';
 const reply=(body:unknown,status=200,token?:string)=>Response.json(body,{status,headers:{...baseHeaders,...(token!==undefined?{'Set-Cookie':cookie(token,secure)}:{})}});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({message:'Same-origin session request required.'},403);
 if(request.method==='DELETE')return reply({signedOut:true},200,'');
 if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json'))return reply({message:'Invalid session request.'},400);
 if(!config)return reply({message:'Sign-in is not configured.'},503);
 let input:Record<string,unknown>;try{const raw=await request.text();if(raw.length>8192)throw Error();input=JSON.parse(raw);if(!input||Array.isArray(input)||typeof input!=='object')throw Error();}catch{return reply({message:'Invalid session request.'},400);}
 let stored='';try{stored=decodeURIComponent((request.headers.get('cookie')??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)??'');}catch{return reply({message:'Session is invalid.'},401,'');}
 const token=input.action==='establish'?input.refreshToken:input.action==='restore'?stored:null;
 if(typeof token!=='string'||!token||token.length>4096||/[\r\n]/.test(token))return reply({message:'No saved session.'},401,'');
 try{
  const response=await fetcher(`${config.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:token}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok){await response.body?.cancel();return response.status===400||response.status===401||response.status===403?reply({message:'Your session ended. Sign in again.'},401,''):reply({message:'Cannot restore your session right now. Please retry.'},503);}
  const data=await response.json();
  if(typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token||data.refresh_token.length>4096||typeof data.expires_in!=='number'||!Number.isFinite(data.expires_in)||data.expires_in<=0)return reply({message:'Invalid session response.'},503);
  return reply({access_token:data.access_token,expires_in:data.expires_in,refreshable:true},200,data.refresh_token);
 }catch{return reply({message:'Cannot restore your session right now. Please retry.'},503);}
}
