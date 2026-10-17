import {BadRequestException,Body,Controller,Header,Post,Req,ServiceUnavailableException} from '@nestjs/common';
import {EditorPlanner,validateEditorInput} from '@sma/ai';
import type {Request} from 'express';
import {ImageAiService} from './image-ai.service';
import type {RequestIdentity} from './security';
import {textAiConfig} from './text-ai.config';
import {aiServiceFailure} from './ai-errors';
@Controller('media/editor-plan')
export class EditorAiController {
 constructor(private readonly quota:ImageAiService){}
 @Post() @Header('Cache-Control','private, no-store')
 async plan(@Req() request:Request&{identity:RequestIdentity},@Body() body:unknown){
  let input:ReturnType<typeof validateEditorInput>;
  try{input=validateEditorInput(body);}catch{throw new BadRequestException('Provide an edit instruction and valid editor settings.');}
  const config=textAiConfig();let provider:EditorPlanner;
  try{if(!config.configured||(config.provider!=='groq'&&config.provider!=='huggingface'))throw new Error();provider=new EditorPlanner(config.apiKey!,config.provider,config.model);}catch{throw new ServiceUnavailableException('AI editing is not configured');}
  await this.quota.reserveAttempt(request.identity,true);
  try{return await provider.plan(input);}catch(error){throw aiServiceFailure(error,'AI editing could not prepare this change. Please retry later.');}
 }
}
