import {identity,origin,database,secret,appId,redirect,graph,providerJson,saveAccounts} from "../../../../../lib/social";
import {validProvider,cookieValue,hash} from "../../../../../lib/oauth-security";
export async function GET(request:Request,context:{params:Promise<{provider:string}>}){
 const {provider}=await context.params;if(!validProvider(provider))return new Response("Unknown provider",{status:404});
 const done=(ok:boolean)=>new Response(null,{status:303,headers:{Location:`${origin()}/connect?result=${ok?"connected":"failed"}`,"Set-Cookie":`__Host-orbit-${provider}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 try{
  const userId=await identity(),url=new URL(request.url),state=url.searchParams.get("state")??"",browser=cookieValue(request,`__Host-orbit-${provider}`);
  if(!/^[a-f0-9]{64}$/.test(state)||!/^[a-f0-9]{64}$/.test(browser))return done(false);
  const record=await database().prepare("DELETE FROM oauth_state WHERE hash=? AND user_id=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING hash").bind(await hash(state),userId,provider,await hash(browser),Date.now()).first();
  if(!record||url.searchParams.has("error"))return done(false);
  const code=url.searchParams.get("code");if(!code||code.length>2048)return done(false);
  const appSecret=await secret(userId,provider);
  let tokenResponse:Record<string,any>;
  if(provider==="threads"){
   const body=new URLSearchParams({client_id:appId(provider),client_secret:appSecret,code,grant_type:"authorization_code",redirect_uri:redirect(provider)});
   const short=await providerJson(new URL("https://graph.threads.net/oauth/access_token"),{method:"POST",body});
   if(typeof short.access_token!=="string")throw Error("Invalid token response");
   const exchange=new URL("https://graph.threads.net/access_token");exchange.search=new URLSearchParams({grant_type:"th_exchange_token",client_secret:appSecret,access_token:short.access_token}).toString();tokenResponse=await providerJson(exchange);
  }else{
   const exchange=new URL(`${graph()}/oauth/access_token`);exchange.search=new URLSearchParams({client_id:appId(provider),client_secret:appSecret,code,redirect_uri:redirect(provider)}).toString();const short=await providerJson(exchange);
   if(typeof short.access_token!=="string")throw Error("Invalid token response");
   const longer=new URL(`${graph()}/oauth/access_token`);longer.search=new URLSearchParams({client_id:appId(provider),client_secret:appSecret,grant_type:"fb_exchange_token",fb_exchange_token:short.access_token}).toString();tokenResponse=await providerJson(longer);
  }
  if(typeof tokenResponse.access_token!=="string"||typeof tokenResponse.expires_in!=="number"||tokenResponse.expires_in<=0)throw Error("Invalid token expiry");
  const token=tokenResponse.access_token,expiresAt=Date.now()+Math.min(tokenResponse.expires_in,5184000)*1000;
  if(provider==="threads"){
   const me=new URL("https://graph.threads.net/v1.0/me");me.searchParams.set("fields","id,username");const account=await providerJson(me,{headers:{Authorization:`Bearer ${token}`}});
   await saveAccounts(userId,[{platform:"threads",externalId:String(account.id),name:account.username,accountType:"PROFILE",token,expiresAt}]);
  }else{
   const endpoint=new URL(`${graph()}/me/accounts`);endpoint.search=new URLSearchParams({fields:"id,name,access_token,instagram_business_account",limit:"25"}).toString();const result=await providerJson(endpoint,{headers:{Authorization:`Bearer ${token}`}});
   if(!Array.isArray(result.data)||!result.data.length||result.data.length>25)throw Error("No Pages authorized");
   const accounts=[];
   for(const page of result.data){
    if(!/^\d+$/.test(String(page.id))||typeof page.access_token!=="string")throw Error("Invalid Page response");
    accounts.push({platform:"facebook",externalId:String(page.id),name:page.name,accountType:"PAGE",token:page.access_token,expiresAt});
    const igId=page.instagram_business_account?.id;
    if(igId){if(!/^\d+$/.test(String(igId)))throw Error("Invalid Instagram ID");const igUrl=new URL(`${graph()}/${igId}`);igUrl.searchParams.set("fields","id,username,account_type");const ig=await providerJson(igUrl,{headers:{Authorization:`Bearer ${token}`}});accounts.push({platform:"instagram",externalId:String(ig.id),name:ig.username,accountType:["BUSINESS","MEDIA_CREATOR"].includes(ig.account_type)?ig.account_type:null,token,expiresAt});}
   }
   await saveAccounts(userId,accounts);
  }
  return done(true);
 }catch{return done(false);}
}
