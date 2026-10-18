import type {AuthSession} from './auth-client';
let pending:Promise<unknown>=Promise.resolve();
async function serial<T>(action:()=>Promise<T>):Promise<T>{
 const run=()=>typeof navigator!=='undefined'&&navigator.locks?navigator.locks.request('orbit-auth-session',async()=>await action()) as Promise<T>:action();
 const result=pending.then(run,run);pending=result.catch(()=>{});return result;
}
export async function browserSession(refreshToken?:string):Promise<AuthSession|null>{
 return serial(async()=>{
  let response:Response;try{response=await fetch('/api/auth/session',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(refreshToken?{action:'establish',refreshToken}:{action:'restore'}),signal:AbortSignal.timeout(25000)});}catch{throw Object.assign(Error('Cannot restore your session right now. Check your connection and retry.'),{retryable:true});}
  if(response.status===401)return null;
  if(!response.ok)throw Object.assign(Error('Cannot restore your session right now. Check your connection and retry.'),{retryable:true});
  const body=await response.json();if(typeof body.access_token!=='string'||typeof body.expires_in!=='number'||body.expires_in<=0||body.refreshable!==true)throw Error('Invalid session response.');
  return {access_token:body.access_token,expires_in:body.expires_in,refreshable:true};
 });
}
export async function clearBrowserSession(){return serial(async()=>{const response=await fetch('/api/auth/session',{method:'DELETE',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Could not clear saved session. Retry sign out.');});}
