import {createHash} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {SocialOAuthService,socialOAuthConfig} from './social-oauth.service';
import {SocialOAuthController} from './social-oauth.controller';
import {TokenVault} from './security';
import type {DatabaseService} from './database.service';
const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
const browser='b'.repeat(43),state='s'.repeat(43),key=Buffer.alloc(32,7).toString('base64');
const identity={sub:'s',userId:'owner',workspaceId:'workspace-a',role:'OWNER'};
function fixture(provider='facebook'){
 const record={id:digest(state),browserHash:digest(browser),workspaceId:'workspace-a',userId:'owner',provider,expiresAt:new Date(Date.now()+600000),consumedAt:null as Date|null};
 const db={socialOAuthState:{create:vi.fn(),findUnique:vi.fn(async()=>record),updateMany:vi.fn(async()=>{if(record.consumedAt)return {count:0};record.consumedAt=new Date();return {count:1};})},membership:{findFirst:vi.fn(async()=>({role:'OWNER'}))},socialAccount:{upsert:vi.fn(async(_query:any)=>({id:'account'})),findMany:vi.fn(async(_query:any)=>[])},oAuthToken:{upsert:vi.fn()},auditLog:{create:vi.fn()},$transaction:vi.fn()};
 db.$transaction.mockImplementation(async(fn:any)=>fn(db));
 return {record,db,service:new SocialOAuthService(db as unknown as DatabaseService)};
}
const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function providerResponses(provider='facebook'){
 const perms=provider==='threads'?['threads_basic']:provider==='instagram'?['pages_show_list','pages_read_engagement','instagram_basic']:['pages_show_list','pages_read_engagement'];
 return [response({access_token:'user-secret',expires_in:1}),response({data:{is_valid:true,app_id:'12345',expires_at:Math.floor(Date.now()/1000)+3500,scopes:[...perms,'extra_permission']}}),...(provider==='threads'?[response({id:'123',username:'profile'})]:[response({data:perms.map(permission=>({permission,status:'granted'}))}),response({data:[{id:'123',name:'Page',access_token:'page-secret',instagram_business_account:{id:'456',username:'professional'}}]})])];
}
beforeEach(()=>{for(const [name,value] of Object.entries({WEB_URL:'https://web.example',API_URL:'https://api.example',META_APP_ID:'12345',META_APP_SECRET:'server-secret',META_API_VERSION:'v25.0',META_REDIRECT_URI:'https://web.example/api/social-oauth/meta/callback',THREADS_APP_ID:'12345',THREADS_APP_SECRET:'threads-secret',THREADS_REDIRECT_URI:'https://web.example/api/social-oauth/threads/callback',TOKEN_ENCRYPTION_KEY:key}))vi.stubEnv(name,value);vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('social OAuth state and tenant boundaries',()=>{
 it('binds a ten minute single use request to workspace, owner and hashed browser',async()=>{
  const {service,db}=fixture();const result=await service.start(identity,'facebook',{},browser),url=new URL(result.authorizationUrl),saved=db.socialOAuthState.create.mock.calls[0][0].data;
  expect(url.origin).toBe('https://www.facebook.com');expect(saved).toMatchObject({workspaceId:'workspace-a',userId:'owner',browserHash:digest(browser),id:digest(url.searchParams.get('state')!)});expect(saved.id).not.toBe(url.searchParams.get('state'));expect(saved.expiresAt.getTime()-Date.now()).toBeGreaterThan(599000);
 });
 it('uses the current official Threads authorization host and minimum scope',async()=>{const {service}=fixture();const url=new URL((await service.start(identity,'threads',{},browser)).authorizationUrl);expect(url.origin).toBe('https://www.threads.com');expect(url.searchParams.get('scope')).toBe('threads_basic');});
 it('requires owner/admin role, browser binding, empty body and exact configured callback',async()=>{const {service,db}=fixture();await expect(service.start({...identity,role:'EDITOR'},'facebook',{},browser)).rejects.toThrow();await expect(service.start(identity,'facebook',{},'bad')).rejects.toThrow();await expect(service.start(identity,'facebook',{workspaceId:'other'},browser)).rejects.toThrow();vi.stubEnv('META_REDIRECT_URI','https://evil.example/callback');await expect(service.start(identity,'facebook',{},browser)).rejects.toThrow();expect(db.socialOAuthState.create).not.toHaveBeenCalled();});
 it.each(['wrong browser','expired','consumed','wrong family'])('rejects %s without consuming state or contacting provider',async(reason)=>{const {service,record,db}=fixture();if(reason==='expired')record.expiresAt=new Date(0);if(reason==='consumed')record.consumedAt=new Date();await expect(service.callback(reason==='wrong family'?'threads':'meta',state,reason==='wrong browser'?'x'.repeat(43):browser,'code',false)).rejects.toThrow();expect(db.socialOAuthState.updateMany).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();});
 it('consumes denied authorization once without contacting provider',async()=>{const {service,db}=fixture();expect(await service.callback('meta',state,browser,undefined,true)).toEqual({provider:'facebook',status:'failed'});await expect(service.callback('meta',state,browser,'code',false)).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();expect(db.oAuthToken.upsert).not.toHaveBeenCalled();});
 it('only one concurrent callback can exchange the code',async()=>{const {service}=fixture();vi.mocked(fetch).mockRejectedValue(new Error('secret provider failure'));await Promise.allSettled([service.callback('meta',state,browser,'code',false),service.callback('meta',state,browser,'code',false)]);expect(fetch).toHaveBeenCalledTimes(1);});
 it('rechecks current workspace membership before exchange',async()=>{const {service,db}=fixture();db.membership.findFirst.mockResolvedValue(null as any);await expect(service.callback('meta',state,browser,'code',false)).rejects.toThrow('Workspace permission has changed');expect(fetch).not.toHaveBeenCalled();});
});
describe('social provider discovery and token storage',()=>{
 it.each(['facebook','instagram','threads'])('discovers %s, stores encrypted grant with account AAD, and reports actual scopes/expiry',async(provider)=>{
  const {service,db}=fixture(provider),replies=providerResponses(provider);vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);
  expect(await service.callback(provider==='threads'?'threads':'meta',state,browser,'code',false)).toMatchObject({status:'connected'});
  const saved=db.oAuthToken.upsert.mock.calls[0][0].create,accountId=provider==='instagram'?'456':'123';expect(saved.scopes).toContain('extra_permission');expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now()+3000000);expect(new TokenVault(key).decrypt(saved.encryptedAccessToken,`workspace-a:${provider.toUpperCase()}:${accountId}`)).toBe(provider==='threads'?'user-secret':'page-secret');expect(()=>new TokenVault(key).decrypt(saved.encryptedAccessToken,`workspace-b:${provider.toUpperCase()}:${accountId}`)).toThrow();
  const upsert=db.socialAccount.upsert.mock.calls[0][0];expect(upsert.create.workspaceId).toBe('workspace-a');expect(upsert.where.workspaceId_platform_externalAccountId.workspaceId).toBe('workspace-a');expect(JSON.stringify(await service.status(identity))).not.toContain('secret');
  if(provider==='threads'){const profile=new URL(String(vi.mocked(fetch).mock.calls[2][0]));expect(profile.origin+profile.pathname).toBe('https://graph.threads.com/me');expect(profile.searchParams.get('fields')).toBe('id,username');expect(profile.searchParams.get('access_token')).toBe('user-secret');}
 });
 it.each(['missing scopes','unknown expiry','wrong app','no accounts','oversized response','provider error','membership removed'])('fails safely on %s',async(reason)=>{
  const {service,db}=fixture(),replies=providerResponses();
  if(['missing scopes','unknown expiry','wrong app'].includes(reason))replies[1]=response({data:{is_valid:true,app_id:reason==='wrong app'?'999':'12345',expires_at:reason==='unknown expiry'?0:Math.floor(Date.now()/1000)+3600,scopes:reason==='missing scopes'?[]:['pages_show_list','pages_read_engagement']}});
  if(reason==='no accounts')replies[3]=response({data:[]});if(reason==='oversized response')replies[0]=new Response('x'.repeat(524289));if(reason==='provider error')replies[0]=new Response('client_secret=leak',{status:400});if(reason==='membership removed')db.membership.findFirst.mockResolvedValueOnce({role:'OWNER'}).mockResolvedValue(null as any);
  vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);expect(await service.callback('meta',state,browser,'code',false)).toEqual({provider:'facebook',status:'failed'});expect(db.oAuthToken.upsert).not.toHaveBeenCalled();
 });
 it.each(['expires_at','data_access_expires_at'].flatMap(field=>[-1,'future',null,1.5,Number.MAX_SAFE_INTEGER+1].map(value=>({field,value}))))('rejects malformed $field=$value even when the other expiry is valid',async({field,value})=>{
  const {service,db}=fixture(),replies=providerResponses(),future=Math.floor(Date.now()/1000)+3600;
  replies[1]=response({data:{is_valid:true,app_id:'12345',scopes:['pages_show_list','pages_read_engagement'],expires_at:future,data_access_expires_at:future,[field]:value}});
  vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);
  expect(await service.callback('meta',state,browser,'code',false)).toEqual({provider:'facebook',status:'failed'});expect(fetch).toHaveBeenCalledTimes(2);expect(db.oAuthToken.upsert).not.toHaveBeenCalled();
 });
 it.each(['expires_at','data_access_expires_at'])('accepts a zero %s sentinel only alongside a positive provider bound',async(field)=>{
  const {service,db}=fixture(),replies=providerResponses(),future=Math.floor(Date.now()/1000)+3600;
  replies[1]=response({data:{is_valid:true,app_id:'12345',scopes:['pages_show_list','pages_read_engagement'],expires_at:future,data_access_expires_at:future,[field]:0}});
  vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);
  expect(await service.callback('meta',state,browser,'code',false)).toMatchObject({status:'connected'});expect(db.oAuthToken.upsert.mock.calls[0][0].create.expiresAt).toEqual(new Date(future*1000));
 });
 it('rejects two zero expiry sentinels without a positive provider bound',async()=>{
  const {service,db}=fixture(),replies=providerResponses();replies[1]=response({data:{is_valid:true,app_id:'12345',scopes:['pages_show_list','pages_read_engagement'],expires_at:0,data_access_expires_at:0}});
  vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);expect(await service.callback('meta',state,browser,'code',false)).toMatchObject({status:'failed'});expect(db.oAuthToken.upsert).not.toHaveBeenCalled();
 });
 it('bounds discovery paging and ignores provider next URL destinations',async()=>{const {service,db}=fixture(),replies=providerResponses();replies[3]=response({data:[],paging:{next:'https://evil.example/steal',cursors:{after:'cursor'}}});for(let i=0;i<5;i++)replies.push(response({data:[],paging:{next:'https://evil.example',cursors:{after:'cursor'}}}));vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);expect(await service.callback('meta',state,browser,'code',false)).toMatchObject({status:'failed'});expect(vi.mocked(fetch).mock.calls.every(call=>new URL(String(call[0])).hostname==='graph.facebook.com')).toBe(true);expect(fetch).toHaveBeenCalledTimes(8);expect(db.oAuthToken.upsert).not.toHaveBeenCalled();});
});
describe('status and public callback validation',()=>{
 it('keeps a discovery-only Facebook connection connected while exposing missing publishing permission',async()=>{
  const {service,db}=fixture();
  db.socialAccount.findMany.mockResolvedValue([{id:'fb',platform:'FACEBOOK',displayName:'My Page',status:'connected',token:{expiresAt:new Date(Date.now()+60000),scopes:['pages_show_list','pages_read_engagement']}}] as any);
  const result=await service.status(identity),facebook=result.providers.facebook;
  expect(facebook).toMatchObject({connected:true,reconnectRequired:false,publishing:{implemented:false,canPublishText:false,canPublishImage:false,canPublishVideo:false}});
  expect(facebook.accounts[0]).toMatchObject({connected:true,publishing:{missingScopes:['pages_manage_posts']}});
  expect(facebook.accounts[0].publishing.reason).toContain('publishing permission has not been granted');
  expect(result.livePublishing).toBe(false);expect(fetch).not.toHaveBeenCalled();
 });
 it.each([
  {provider:'facebook',platform:'FACEBOOK',granted:['pages_show_list','pages_read_engagement','pages_manage_posts']},
  {provider:'threads',platform:'THREADS',granted:['threads_basic','threads_content_publish']},
  {provider:'instagram',platform:'INSTAGRAM',granted:['pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish']},
  {provider:'tiktok',platform:'TIKTOK',granted:['user.info.basic','video.publish']},
 ])('does not claim implemented publishing for $provider even when its permission is stored',async({provider,platform,granted})=>{
  const {service,db}=fixture();
  db.socialAccount.findMany.mockResolvedValue([{id:'a',platform,displayName:'Account',status:'connected',token:{expiresAt:new Date(Date.now()+60000),scopes:granted}}] as any);
  const account=(await service.status(identity)).providers[provider].accounts[0];
  expect(account).toMatchObject({connected:true,publishing:{implemented:false,canPublishText:false,canPublishImage:false,canPublishVideo:false,missingScopes:[]}});
  expect(account.publishing.reason).toContain('permission is recorded');
  expect(fetch).not.toHaveBeenCalled();
 });
 it('distinguishes expired account access from a missing publishing permission',async()=>{
  const {service,db}=fixture();
  db.socialAccount.findMany.mockResolvedValue([{id:'a',platform:'THREADS',displayName:'Account',status:'connected',token:{expiresAt:new Date(0),scopes:['threads_basic','threads_content_publish']}}] as any);
  const threads=(await service.status(identity)).providers.threads;
  expect(threads).toMatchObject({connected:false,reconnectRequired:true});
  expect(threads.accounts[0].publishing).toMatchObject({canPublishText:false,missingScopes:[]});
  expect(threads.accounts[0].publishing.reason).toContain('access needs reconnecting');
 });
 it.each(['facebook','instagram','threads','tiktok'])('does not request new publishing permission when connecting $provider',async provider=>{
  vi.stubEnv('TIKTOK_CLIENT_KEY','client_key-fixture');vi.stubEnv('TIKTOK_CLIENT_SECRET','tiktok-client-secret');vi.stubEnv('TIKTOK_REDIRECT_URI','https://web.example/api/social-oauth/tiktok/callback');
  const {service}=fixture(provider);
  const url=new URL((await service.start(identity,provider as 'facebook'|'instagram'|'threads'|'tiktok',{},browser)).authorizationUrl);
  expect(url.searchParams.get('scope')).not.toMatch(/pages_manage_posts|instagram_content_publish|threads_content_publish|video\.publish/);
 });
 it('queries current workspace, treats expired/missing-scope tokens as reconnect and keeps live publishing disabled',async()=>{const {service,db}=fixture();db.socialAccount.findMany.mockResolvedValue([{id:'a',platform:'FACEBOOK',displayName:'Page',status:'connected',token:{expiresAt:new Date(0),scopes:['pages_show_list','pages_read_engagement']}},{id:'b',platform:'THREADS',displayName:'Profile',status:'connected',token:{expiresAt:new Date(Date.now()+60000),scopes:[]}}] as any);const result=await service.status(identity);expect(db.socialAccount.findMany.mock.calls[0][0].where).toEqual({workspaceId:'workspace-a'});expect(result.livePublishing).toBe(false);expect(result.providers.facebook).toMatchObject({connected:false,reconnectRequired:true});expect(result.providers.threads.connected).toBe(false);vi.stubEnv('TOKEN_ENCRYPTION_KEY','');expect((await service.status(identity)).providers.facebook.configured).toBe(false);expect(socialOAuthConfig('facebook')).toBeNull();});
 it('rejects unknown route, injected workspace, malformed provider errors; forwards browser binding',()=>{const callback=vi.fn(),controller=new SocialOAuthController({callback} as unknown as SocialOAuthService);expect(()=>controller.callback('unknown',{})).toThrow();expect(()=>controller.callback('meta',{state,browserNonce:browser,workspaceId:'evil'})).toThrow();expect(()=>controller.callback('meta',{state,browserNonce:browser,error:{message:'secret'}})).toThrow();controller.callback('meta',{state,browserNonce:browser,error:'access_denied'});expect(callback).toHaveBeenCalledWith('meta',state,browser,undefined,true);});
});

describe('TikTok read-only connection',()=>{
 const grant=()=>({access_token:'tiktok-access-secret',open_id:'opaque-user-id',token_type:'Bearer',expires_in:86400,refresh_token:'unused-refresh-secret',scope:'user.info.basic'});
 const profile=()=>({data:{user:{open_id:'opaque-user-id',display_name:'My TikTok'}},error:{code:'ok'}});
 beforeEach(()=>{vi.stubEnv('TIKTOK_CLIENT_KEY','client_key-fixture');vi.stubEnv('TIKTOK_CLIENT_SECRET','tiktok-client-secret');vi.stubEnv('TIKTOK_REDIRECT_URI','https://web.example/api/social-oauth/tiktok/callback');});
 it('starts on fixed official host with client_key and minimum scope, independently of Meta configuration',async()=>{const {service}=fixture('tiktok');vi.stubEnv('META_API_VERSION','');const url=new URL((await service.start(identity,'tiktok',{},browser)).authorizationUrl);expect(url.origin+url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');expect(url.searchParams.get('client_key')).toBe('client_key-fixture');expect(url.searchParams.has('client_id')).toBe(false);expect(url.searchParams.get('scope')).toBe('user.info.basic');expect(url.searchParams.get('redirect_uri')).toBe('https://web.example/api/social-oauth/tiktok/callback');});
 it.each(['TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','TIKTOK_REDIRECT_URI','TOKEN_ENCRYPTION_KEY'])('requires %s without dispatch when absent',async(name)=>{vi.stubEnv(name,'');const {service,db}=fixture('tiktok');await expect(service.start(identity,'tiktok',{},browser)).rejects.toThrow();expect(db.socialOAuthState.create).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();});
 it('exchanges server-side, verifies opaque identity, encrypts access token with workspace AAD and discards unused refresh token',async()=>{const {service,db}=fixture('tiktok'),replies=[response(grant()),response(profile())];vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);expect(await service.callback('tiktok',state,browser,'private-code',false)).toEqual({provider:'tiktok',status:'connected'});expect(fetch).toHaveBeenCalledTimes(2);const [url,init]=vi.mocked(fetch).mock.calls[0];expect(url).toBe('https://open.tiktokapis.com/v2/oauth/token/');expect(Object.fromEntries(new URLSearchParams(init!.body as string))).toEqual({client_key:'client_key-fixture',client_secret:'tiktok-client-secret',code:'private-code',grant_type:'authorization_code',redirect_uri:'https://web.example/api/social-oauth/tiktok/callback'});const [profileUrl,profileInit]=vi.mocked(fetch).mock.calls[1];expect(profileUrl).toBe('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name');expect(new Headers(profileInit!.headers).get('Authorization')).toBe('Bearer tiktok-access-secret');expect(profileInit!.redirect).toBe('error');const saved=db.oAuthToken.upsert.mock.calls[0][0].create;expect(new TokenVault(key).decrypt(saved.encryptedAccessToken,'workspace-a:TIKTOK:opaque-user-id')).toBe('tiktok-access-secret');expect(()=>new TokenVault(key).decrypt(saved.encryptedAccessToken,'workspace-b:TIKTOK:opaque-user-id')).toThrow();expect(saved.scopes).toEqual(['user.info.basic']);expect(saved.expiresAt.getTime()-Date.now()).toBeGreaterThan(86399000);expect(JSON.stringify(db.oAuthToken.upsert.mock.calls)).not.toContain('unused-refresh-secret');expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain('secret');});
 it.each(['wrong browser','expired','consumed','wrong family','membership removed','denied'])('rejects %s without contacting TikTok',async(reason)=>{const {service,record,db}=fixture('tiktok');if(reason==='expired')record.expiresAt=new Date(0);if(reason==='consumed')record.consumedAt=new Date();if(reason==='membership removed')db.membership.findFirst.mockResolvedValue(null as any);const result=service.callback(reason==='wrong family'?'meta':'tiktok',state,reason==='wrong browser'?'x'.repeat(43):browser,'code',reason==='denied');if(reason==='denied')expect(await result).toMatchObject({status:'failed'});else await expect(result).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();expect(db.oAuthToken.upsert).not.toHaveBeenCalled();});
 it.each(['missing scope','wrong token type','empty token','bad expiry','oversized expiry','fraction expiry','identity mismatch','provider error','token error','lost membership','oversize'])('fails closed on %s without account writes or secret output',async(reason)=>{const {service,db}=fixture('tiktok'),token=grant(),user=profile();if(reason==='missing scope')token.scope='video.list';if(reason==='wrong token type')token.token_type='Basic';if(reason==='empty token')token.access_token='';if(reason==='bad expiry')token.expires_in=0;if(reason==='oversized expiry')token.expires_in=86401;if(reason==='fraction expiry')token.expires_in=1.5;if(reason==='identity mismatch')user.data.user.open_id='other-user';if(reason==='provider error')user.error.code='access_token_invalid';if(reason==='lost membership')db.membership.findFirst.mockResolvedValueOnce({role:'OWNER'}).mockResolvedValue(null as any);const replies=[reason==='token error'?response({error:'invalid_client',error_description:'private secret'}):reason==='oversize'?new Response('x'.repeat(524289)):response(token),response(user)];vi.mocked(fetch).mockImplementation(async()=>replies.shift()!);expect(await service.callback('tiktok',state,browser,'code',false)).toEqual({provider:'tiktok',status:'failed'});expect(db.oAuthToken.upsert).not.toHaveBeenCalled();expect(db.socialAccount.upsert).not.toHaveBeenCalled();});
 it('reports expired grant as reconnect required and keeps publishing off',async()=>{const {service,db}=fixture('tiktok');db.socialAccount.findMany.mockResolvedValue([{id:'t',platform:'TIKTOK',displayName:'TikTok',status:'connected',token:{expiresAt:new Date(0),scopes:['user.info.basic']}}] as any);const status=await service.status(identity);expect(status.providers.tiktok).toMatchObject({configured:true,oauthImplemented:true,connected:false,reconnectRequired:true});expect(status.livePublishing).toBe(false);});
});
