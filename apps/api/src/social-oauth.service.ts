import {BadRequestException,ForbiddenException,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {createHash,randomBytes} from 'node:crypto';
import {DatabaseService} from './database.service';
import {TokenVault,type RequestIdentity} from './security';
import {requireRole} from './workflow.service';
export const socialProviders=['facebook','instagram','threads','tiktok'] as const;
export type SocialProvider=typeof socialProviders[number];
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const nonce=()=>randomBytes(32).toString('base64url');
const validNonce=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
function origin(value:string|undefined){const url=new URL(value??'');if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();return url.origin;}
export function socialOAuthConfig(provider:SocialProvider,env:NodeJS.ProcessEnv=process.env){
 try{
  const web=origin(env.WEB_URL),api=origin(env.API_URL),threads=provider==='threads',tiktok=provider==='tiktok';
  const appId=tiktok?env.TIKTOK_CLIENT_KEY:threads?env.THREADS_APP_ID:env.META_APP_ID,secret=tiktok?env.TIKTOK_CLIENT_SECRET:threads?env.THREADS_APP_SECRET:env.META_APP_SECRET;
  const callback=`${web}/api/social-oauth/${tiktok?'tiktok':threads?'threads':'meta'}/callback`,redirect=tiktok?env.TIKTOK_REDIRECT_URI:threads?env.THREADS_REDIRECT_URI:env.META_REDIRECT_URI;
  const version=env.META_API_VERSION;
  if(!appId||!(tiktok?/^[A-Za-z0-9_-]{3,200}$/:/^\d{3,40}$/).test(appId)||!secret||secret.length>512||/[\r\n]/.test(secret)||redirect!==callback||(!threads&&!tiktok&&!/^v\d{2}\.0$/.test(version??'')))throw Error();
  const key=env.TOKEN_ENCRYPTION_KEY??'';new TokenVault(key);
  return {web,api,appId,secret,callback,version:version??'',key};
 }catch{return null;}
}
export function parseSocialProvider(value:string):SocialProvider{if(!(socialProviders as readonly string[]).includes(value))throw new BadRequestException('Unsupported social provider');return value as SocialProvider;}
const scopes=(p:SocialProvider)=>p==='tiktok'?['user.info.basic']:p==='threads'?['threads_basic']:p==='instagram'?['pages_show_list','pages_read_engagement','instagram_basic']:['pages_show_list','pages_read_engagement'];
@Injectable()
export class SocialOAuthService {
 constructor(private readonly db:DatabaseService){}
 private config(provider:SocialProvider){const config=socialOAuthConfig(provider);if(!config)throw new ServiceUnavailableException('Social connection requires server app credentials, HTTPS callback URLs, encryption key and, for Facebook/Instagram, a pinned Meta API version.');return config;}
 async start(identity:RequestIdentity,provider:SocialProvider,input:unknown,browser:unknown){
  requireRole(identity,['OWNER','ADMIN']);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new BadRequestException('Connection request must be empty.');
  if(!validNonce(browser))throw new BadRequestException('Browser connection binding required. Start from Orbit Channels.');
  const config=this.config(provider),state=nonce(),expiresAt=new Date(Date.now()+600000);
  await this.db.socialOAuthState.create({data:{id:hash(state),workspaceId:identity.workspaceId,userId:identity.userId,provider,expiresAt,browserHash:hash(browser)}});
  const url=new URL(provider==='tiktok'?'https://www.tiktok.com/v2/auth/authorize/':provider==='threads'?'https://www.threads.com/oauth/authorize':`https://www.facebook.com/${config.version}/dialog/oauth`);
  for(const [key,value] of Object.entries({...(provider==='tiktok'?{client_key:config.appId}:{client_id:config.appId}),redirect_uri:config.callback,response_type:'code',scope:scopes(provider).join(','),state}))url.searchParams.set(key,value);
  return {authorizationUrl:url.href,expiresAt:expiresAt.toISOString()};
 }
 private async json(url:string,init:RequestInit,token?:string):Promise<Record<string,any>>{
  // Every destination is assembled from fixed Meta or TikTok hosts. Never follow redirects containing credentials.
  const destination=new URL(url),threads=destination.hostname==='graph.threads.com';
  // Meta's current Threads sample passes its token as an access_token parameter.
  if(threads&&token)destination.searchParams.set('access_token',token);
  const response=await fetch(destination.href,{...init,headers:{...init.headers,...(token&&!threads?{Authorization:`Bearer ${token}`}:{})},redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok){await response.body?.cancel();throw new ServiceUnavailableException('Social provider could not complete authorisation. Reconnect and review account permissions.');}
  if(!response.body)throw Error('Invalid provider response');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const result=await reader.read();if(result.done)break;length+=result.value.length;if(length>524288)throw Error('Provider response too large');chunks.push(result.value);}}finally{await reader.cancel().catch(()=>{});}
  const text=Buffer.concat(chunks).toString('utf8'),parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||(destination.hostname==='open.tiktokapis.com'?(parsed.error!==undefined&&(!parsed.error||typeof parsed.error!=='object'||parsed.error.code!=='ok')):parsed.error))throw Error('Invalid provider response');return parsed;
 }
 async callback(route:'meta'|'threads'|'tiktok',state:unknown,browser:unknown,code:unknown,denied:boolean){
  if(!validNonce(state)||!validNonce(browser))throw new BadRequestException('Invalid connection state.');
  const record=await this.db.socialOAuthState.findUnique({where:{id:hash(state)}});
  if(!record||record.consumedAt||record.expiresAt<=new Date()||record.browserHash!==hash(browser)||(route==='meta'?!['facebook','instagram'].includes(record.provider):record.provider!==route))throw new BadRequestException('Invalid connection state.');
  const provider=parseSocialProvider(record.provider),config=this.config(provider);
  const consumed=await this.db.socialOAuthState.updateMany({where:{id:record.id,consumedAt:null,expiresAt:{gt:new Date()},browserHash:hash(browser)},data:{consumedAt:new Date()}});
  if(consumed.count!==1)throw new BadRequestException('Connection request was already used.');
  const member=await this.db.membership.findFirst({where:{workspaceId:record.workspaceId,userId:record.userId,role:{in:['OWNER','ADMIN']}}});
  if(!member)throw new ForbiddenException('Workspace permission has changed.');
  
  if(denied)return {provider,status:'failed' as const};
  if(typeof code!=='string'||!code||code.length>4096||/[\r\n]/.test(code))throw new BadRequestException('Invalid authorisation code.');
  try{
   if(provider==='tiktok')return await this.connectTikTok(record,config,code);
   const graph=provider==='threads'?'https://graph.threads.com':`https://graph.facebook.com/${config.version}`;
   const token=await this.json(`${graph}/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.appId,client_secret:config.secret,redirect_uri:config.callback,code,...(provider==='threads'?{grant_type:'authorization_code'}:{})}).toString()});
   if(typeof token.access_token!=='string'||!token.access_token||token.access_token.length>16384||/[\r\n]/.test(token.access_token))throw Error('Invalid token');
   // Inspect the actual grant rather than inventing expiry or reporting requested scopes as granted.
   const inspection=await this.json(`${graph}/debug_token?${new URLSearchParams({input_token:token.access_token})}`,{},provider==='threads'?token.access_token:`${config.appId}|${config.secret}`);
   const grant=inspection.data;
   if(!grant||grant.is_valid!==true||String(grant.app_id)!==config.appId||!Array.isArray(grant.scopes)||scopes(provider).some(scope=>!grant.scopes.includes(scope)))throw Error('Invalid grant');
   const grantedScopes=grant.scopes.filter((scope:unknown):scope is string=>typeof scope==='string'&&scope.length<100);
   const expiryBounds:number[]=[];
   for(const field of ['expires_at','data_access_expires_at']){
    if(!Object.hasOwn(grant,field))continue;
    const value:unknown=grant[field];
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('Invalid provider expiry');
    // Meta uses zero for an unbounded expiry; it cannot establish a future validity bound.
    if(value===0)continue;
    expiryBounds.push(value);
   }
   if(!expiryBounds.length)throw Error('Provider expiry is unknown');
   const expiresAt=new Date(Math.min(...expiryBounds)*1000);
   if(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date())throw Error('Expired grant');
   const accounts:{id:string;name:string;accessToken:string}[]=[];
   if(provider==='threads'){
    const me=await this.json(`${graph}/me?fields=id,username`,{},token.access_token);if(typeof me.id==='string'&&/^\d{1,40}$/.test(me.id)&&typeof me.username==='string'&&me.username.length>0)accounts.push({id:me.id,name:me.username.slice(0,200),accessToken:token.access_token});
   }else{
    const permission=await this.json(`${graph}/me/permissions`,{},token.access_token);
    const granted=new Set(Array.isArray(permission.data)?permission.data.filter((p:any)=>p.status==='granted').map((p:any)=>p.permission):[]);
    if(scopes(provider).some(scope=>!granted.has(scope)))throw Error('Permissions missing');
    let after:string|undefined;
    for(let page=0;page<5;page++){
     const query=new URLSearchParams({fields:provider==='instagram'?'id,name,access_token,instagram_business_account{id,username}':'id,name,access_token',limit:'100',...(after?{after}:{})});
     const found=await this.json(`${graph}/me/accounts?${query}`,{},token.access_token);
     if(!Array.isArray(found.data))throw Error('Invalid accounts');
     for(const account of found.data){const id=provider==='instagram'?account.instagram_business_account?.id:account.id,name=provider==='instagram'?account.instagram_business_account?.username??account.name:account.name;if(typeof id==='string'&&/^\d{1,40}$/.test(id)&&typeof name==='string'&&typeof account.access_token==='string'&&account.access_token.length>0&&account.access_token.length<=16384&&!/[\r\n]/.test(account.access_token))accounts.push({id,name:name.slice(0,200),accessToken:account.access_token});}
     if(!found.paging?.next)break;after=found.paging?.cursors?.after;if(typeof after!=='string'||after.length>2048||page===4)throw Error('Account discovery exceeded limit');
    }
   }
   if(!accounts.length)throw Error('No eligible social account');
   const vault=new TokenVault(config.key);
   await this.db.$transaction(async tx=>{const currentMember=await tx.membership.findFirst({where:{workspaceId:record.workspaceId,userId:record.userId,role:{in:['OWNER','ADMIN']}}});if(!currentMember)throw Error('Workspace permission has changed');for(const account of accounts){const platform=provider.toUpperCase() as 'FACEBOOK'|'INSTAGRAM'|'THREADS';const saved=await tx.socialAccount.upsert({where:{workspaceId_platform_externalAccountId:{workspaceId:record.workspaceId,platform,externalAccountId:account.id}},create:{workspaceId:record.workspaceId,platform,externalAccountId:account.id,displayName:account.name,status:'connected'},update:{displayName:account.name,status:'connected'}});const encryptedAccessToken=vault.encrypt(account.accessToken,`${record.workspaceId}:${platform}:${account.id}`);await tx.oAuthToken.upsert({where:{socialAccountId:saved.id},create:{socialAccountId:saved.id,encryptedAccessToken,expiresAt,scopes:grantedScopes},update:{encryptedAccessToken,encryptedRefreshToken:null,expiresAt,scopes:grantedScopes,keyVersion:1}});}await tx.auditLog.create({data:{workspaceId:record.workspaceId,actorId:record.userId,action:'social.connected',entityType:'SocialAccount',metadata:{provider,count:accounts.length}}});});
   return {provider,status:'connected' as const};
  }catch{return {provider,status:'failed' as const};}
 }
 private async connectTikTok(record:{workspaceId:string;userId:string},config:NonNullable<ReturnType<typeof socialOAuthConfig>>,code:string){
  const issuedBefore=Date.now();
  const token=await this.json('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:config.appId,client_secret:config.secret,code,grant_type:'authorization_code',redirect_uri:config.callback}).toString()});
  const safe=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\r\n\x00-\x1f\x7f]/.test(value);
  if(!safe(token.access_token,16384)||!safe(token.open_id,256)||token.token_type!=='Bearer'||typeof token.expires_in!=='number'||!Number.isSafeInteger(token.expires_in)||token.expires_in<=0||token.expires_in>86400||typeof token.scope!=='string'||token.scope.length>4096)throw Error('Invalid TikTok grant');
  const grantedScopes=token.scope.split(',');
  if(grantedScopes.some(scope=>!safe(scope,100)||!/^[-a-zA-Z0-9._]+$/.test(scope))||!grantedScopes.includes('user.info.basic'))throw Error('TikTok permission missing');
  // Only the code freshly exchanged with this app is accepted. No supplied token/identity enters this flow.
  const expiresAt=new Date(issuedBefore+token.expires_in*1000);
  const profile=await this.json('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',{method:'GET'},token.access_token);
  const user=profile.data?.user;
  if(!user||user.open_id!==token.open_id||!safe(user.display_name,200))throw Error('Invalid TikTok identity');
  const externalAccountId=token.open_id,vault=new TokenVault(config.key);
  await this.db.$transaction(async tx=>{
   if(!await tx.membership.findFirst({where:{workspaceId:record.workspaceId,userId:record.userId,role:{in:['OWNER','ADMIN']}}}))throw Error('Workspace permission has changed');
   const saved=await tx.socialAccount.upsert({where:{workspaceId_platform_externalAccountId:{workspaceId:record.workspaceId,platform:'TIKTOK',externalAccountId}},create:{workspaceId:record.workspaceId,platform:'TIKTOK',externalAccountId,displayName:user.display_name,status:'connected'},update:{displayName:user.display_name,status:'connected'}});
   const encryptedAccessToken=vault.encrypt(token.access_token,`${record.workspaceId}:TIKTOK:${externalAccountId}`);
   // No background refresh is implemented. Do not retain a refresh credential we cannot use safely.
   await tx.oAuthToken.upsert({where:{socialAccountId:saved.id},create:{socialAccountId:saved.id,encryptedAccessToken,expiresAt,scopes:grantedScopes},update:{encryptedAccessToken,encryptedRefreshToken:null,expiresAt,scopes:grantedScopes,keyVersion:1}});
   await tx.auditLog.create({data:{workspaceId:record.workspaceId,actorId:record.userId,action:'social.connected',entityType:'SocialAccount',metadata:{provider:'tiktok',count:1}}});
  });
  return {provider:'tiktok' as const,status:'connected' as const};
 }
 async status(identity:RequestIdentity){
  const accounts=await this.db.socialAccount.findMany({where:{workspaceId:identity.workspaceId},select:{id:true,platform:true,displayName:true,status:true,token:{select:{expiresAt:true,scopes:true}}}});
  return {connectorMode:'oauth',livePublishing:false,providers:Object.fromEntries(socialProviders.map(provider=>{const configured=!!socialOAuthConfig(provider),records=accounts.filter(account=>account.platform===provider.toUpperCase()).map(account=>({id:account.id,name:account.displayName,accountType:provider==='facebook'?'Page':provider==='instagram'?'Professional':'Profile',connected:account.status==='connected'&&!!account.token&&!!account.token.expiresAt&&account.token.expiresAt>new Date()&&scopes(provider).every(scope=>account.token!.scopes.includes(scope)),expiresAt:account.token?.expiresAt?.toISOString()??null,scopes:account.token?.scopes??[]}));return [provider,{configured,credentialsConfigured:configured,oauthImplemented:true,requiresOwnerAuthorization:!records.some(account=>account.connected),connected:records.some(account=>account.connected),reconnectRequired:records.length>0&&!records.some(account=>account.connected),reason:configured?null:'Server app credentials, exact HTTPS callback, encryption key or provider configuration is missing.',accounts:records}];}))};
 }
}
