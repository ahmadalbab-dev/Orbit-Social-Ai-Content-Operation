import {BadRequestException,Body,Controller,Param,Post,Req} from '@nestjs/common';
import type {Request} from 'express';
import {Public,type RequestIdentity} from './security';
import {parseSocialProvider,SocialOAuthService} from './social-oauth.service';
@Controller()
export class SocialOAuthController {
 constructor(private readonly social:SocialOAuthService){}
 @Post('integrations/oauth/:provider/start') start(@Req() request:Request&{identity:RequestIdentity},@Param('provider') provider:string,@Body() body:unknown){return this.social.start(request.identity,parseSocialProvider(provider),body,request.headers['x-orbit-oauth-browser']);}
 @Public() @Post('oauth/:route/callback') callback(@Param('route') route:string,@Body() body:unknown){
  if(route!=='meta'&&route!=='threads'&&route!=='tiktok')throw new BadRequestException('Invalid connection callback.');
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['state','code','error','browserNonce'].includes(key)))throw new BadRequestException('Invalid connection callback.');
  const input=body as Record<string,unknown>;
  if(input.error!==undefined&&(typeof input.error!=='string'||!input.error||input.error.length>256||/[\r\n]/.test(input.error)))throw new BadRequestException('Invalid connection callback.');
  return this.social.callback(route,input.state,input.browserNonce,input.code,typeof input.error==='string'&&input.error.length>0);
 }
}
