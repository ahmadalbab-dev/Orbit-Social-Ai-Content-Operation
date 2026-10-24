/** Fixed Gateway transport. Model and schemas are server controlled, never user URLs. */
export const GATEWAY_CHAT_ENDPOINT = 'https://ai-gateway.vercel.sh/v1/chat/completions';
// Verified against the complete live Gateway catalog on 2026-10-23.
export const DEFAULT_GATEWAY_MODEL = 'google/gemini-3.5-flash-lite';
export const isGatewayModel = (model: string) => model === DEFAULT_GATEWAY_MODEL;
const string = {type:'string'};
const number = {type:'number'};
const boolean = {type:'boolean'};
const object = (properties: Record<string,unknown>, required = Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const array = (items: unknown) => ({type:'array',items});
const segment = object({text:string,start:number,end:number});
export const gatewaySocialSchema = object({variants:array(object({platform:string,copy:string,hashtags:array(string),callToAction:string}))});
export const gatewayVideoSchema = object({title:string,captions:array(segment),scenes:array(segment)});
export function gatewayEditorSchema(kind: 'image'|'video') {
 const layer = object({index:{type:'integer'},x:number,y:number,width:number,opacity:number,...(kind==='video'?{start:number,end:number}:{})},['index']);
 const common = {layers:array(layer),rotation:number,flip:boolean,brightness:number,contrast:number,saturation:number,template:string};
 const properties = kind==='image' ? {...common,backgroundLayerIndex:{type:['integer','null']},baseScale:number,baseX:number,baseY:number,ratio:string,focusX:number,focusY:number,textSize:number,textPosition:string,textColor:string,caption:string,accent:string,background:string} : {...common,format:string,speed:number,volume:number,start:number,duration:number,title:string,news:boolean,captions:array(segment)};
 return object({summary:string,changes:object(properties,[])});
}
/** Reuses bounded parsers/timeouts in each caller. No retries or model fallback. */
export function gatewayCompletionFetch(fetcher: typeof fetch, schema: unknown): typeof fetch {
 return async (_url, init) => {
  const body = JSON.parse(String(init?.body));
  return fetcher(GATEWAY_CHAT_ENDPOINT, {...init, credentials:'omit',redirect:'error', body:JSON.stringify({...body,
   response_format:{type:'json_schema',json_schema:{name:'orbit_result',strict:false,schema}},
   providerOptions:{gateway:{only:['google']}},
  })});
 };
}
