import {AiProviderError,aiProviderResponseError,readBoundedAiJson} from './huggingface.js';
import {validateImageEdit} from './huggingface-image.js';
import {parseInlineImage} from './gemini-image.js';
import {GATEWAY_CHAT_ENDPOINT} from './gateway.js';
// Live catalog: text/image input, text/image output, $0.034 per default image.
export const GATEWAY_IMAGE_MODEL = 'google/gemini-3.1-flash-lite-image';
export class GatewayImageEditor {
 constructor(private readonly apiKey:string,private readonly fetcher:typeof fetch=fetch) {}
 async edit(value:unknown) {
  const input=validateImageEdit(value);
  if(!this.apiKey.trim()||/[\r\n]/.test(this.apiKey))throw new AiProviderError('unconfigured');
  const signal=AbortSignal.timeout(45000);
  try {
   const response=await this.fetcher(GATEWAY_CHAT_ENDPOINT,{
    method:'POST',redirect:'error',credentials:'omit',signal,
    headers:{Authorization:`Bearer ${this.apiKey.trim()}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:GATEWAY_IMAGE_MODEL,stream:false,modalities:['image'],max_tokens:4096,
     providerOptions:{gateway:{only:['google']}},
     messages:[{role:'user',content:[{type:'image_url',image_url:{url:input.imageDataUrl}},{type:'text',text:input.prompt}]}]}),
   });
   if(!response.ok){await response.body?.cancel();throw aiProviderResponseError(response.status);}
   const data=await readBoundedAiJson(response,Math.ceil(4194304/3)*4+65536) as {choices?:{finish_reason?:string;message?:{images?:{image_url?:{url?:unknown}}[]}}[]};
   const choices=data?.choices,images=choices?.[0]?.message?.images;
   if(choices?.length!==1||choices[0].finish_reason!=='stop'||images?.length!==1)throw new AiProviderError('invalid_response');
   const url=images[0]?.image_url?.url;
   const match=typeof url==='string'?/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url):null;
   if(!match)throw new AiProviderError('invalid_response');
   // Reject remote URLs, multiple outputs, MIME mismatches and images over 4 MiB.
   return parseInlineImage(match[2],match[1]);
  }catch(error){if(error instanceof AiProviderError)throw error;throw new AiProviderError(signal.aborted?'timeout':'unavailable');}
 }
}
