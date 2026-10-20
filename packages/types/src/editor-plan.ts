export type EditorLayerChange={index:number;x?:number;y?:number;width?:number;opacity?:number;start?:number;end?:number};
export type ImageEditorChanges = {
 backgroundLayerIndex?:number|null;
 baseScale?:number;baseX?:number;baseY?:number;
 layers?:EditorLayerChange[];
 ratio?:'original'|'1:1'|'4:5'|'9:16'|'16:9';rotation?:0|90|180|270;flip?:boolean;
 brightness?:number;contrast?:number;saturation?:number;focusX?:number;focusY?:number;textSize?:number;
 textPosition?:'top'|'center'|'bottom';textColor?:string;caption?:string;
 template?:'original'|'product'|'poster'|'offer'|'quote';accent?:string;background?:string;
};
export type VideoEditorChanges = {
 layers?:EditorLayerChange[];
 format?:'portrait'|'square'|'landscape';speed?:number;volume?:number;rotation?:0|90|180|270;flip?:boolean;
 start?:number;duration?:number;brightness?:number;contrast?:number;saturation?:number;
 template?:'clean'|'news'|'product'|'cinematic'|'captions';title?:string;news?:boolean;
 captions?:{text:string;start:number;end:number}[];
};
export type ImageEditorState=ImageEditorChanges&{hasBaseImage?:boolean;baseAspectRatio?:number;canvasAspectRatio?:number};
export type VideoEditorState=VideoEditorChanges&{sourceDuration:number};
export type EditorKind='image'|'video';
export type EditorChanges=ImageEditorChanges|VideoEditorChanges;
export type EditorPlan={summary:string;changes:EditorChanges};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const choice=(v:unknown,list:readonly unknown[])=>list.includes(v);
const color=(v:unknown)=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v);
/** Exact finite editable fields only, never executable code or media URLs. */
export function validEditorChanges(kind:EditorKind,value:unknown,state=false):value is EditorChanges {
 if(!object(value))return false;
 const rules:Record<string,(v:unknown)=>boolean>={
 layers:v=>Array.isArray(v)&&v.length<=(kind==='image'?8:6)&&new Set(v.map(l=>l?.index)).size===v.length&&v.every(l=>object(l)&&Number.isInteger(l.index)&&number(l.index,0,kind==='image'?7:5)&&Object.entries(l).every(([key,val])=>{
 const limits:Record<string,[number,number]>={index:[0,kind==='image'?7:5],x:[0,kind==='image'?100:1],y:[0,kind==='image'?100:1],width:[kind==='image'?5:0.05,kind==='image'?150:1],opacity:[0,kind==='image'?100:1],...(kind==='video'?{start:[0,600] as [number,number],end:[0.1,600] as [number,number]}:{})};return Object.hasOwn(limits,key)&&number(val,...limits[key]);})),
 rotation:v=>choice(v,[0,90,180,270]),flip:v=>typeof v==='boolean',
 brightness:v=>number(v,kind==='image'?(state?0:50):0.5,kind==='image'?(state?200:150):1.5),contrast:v=>number(v,kind==='image'?(state?0:50):0.5,kind==='image'?(state?200:150):1.5),saturation:v=>number(v,0,kind==='image'?200:2),
 ...(kind==='image'?{
 backgroundLayerIndex:(v:unknown)=>v===null||(Number.isInteger(v)&&number(v,0,7)),
 baseScale:(v:unknown)=>number(v,0.1,2),baseX:(v:unknown)=>number(v,0,100),baseY:(v:unknown)=>number(v,0,100),
 ...(state?{hasBaseImage:(v:unknown)=>typeof v==='boolean',baseAspectRatio:(v:unknown)=>number(v,0.001,1000),canvasAspectRatio:(v:unknown)=>number(v,0.001,1000)}:{}),
 ratio:(v:unknown)=>choice(v,['original','1:1','4:5','9:16','16:9']),focusX:(v:unknown)=>number(v,0,100),focusY:(v:unknown)=>number(v,0,100),textSize:(v:unknown)=>number(v,60,180),
 textPosition:(v:unknown)=>choice(v,['top','center','bottom']),textColor:color,accent:color,background:color,caption:(v:unknown)=>text(v,200),template:(v:unknown)=>choice(v,['original','product','poster','offer','quote'])
 }:{
 format:(v:unknown)=>choice(v,['portrait','square','landscape']),speed:(v:unknown)=>number(v,0.5,2),volume:(v:unknown)=>number(v,0,1),start:(v:unknown)=>number(v,0,86400),duration:(v:unknown)=>number(v,0.1,120),
 template:(v:unknown)=>choice(v,['clean','news','product','cinematic','captions']),title:(v:unknown)=>text(v,100),news:(v:unknown)=>typeof v==='boolean',
 captions:(v:unknown)=>Array.isArray(v)&&v.length<=20&&v.every(c=>object(c)&&Object.keys(c).every(k=>['text','start','end'].includes(k))&&text(c.text,120)&&number(c.start,0,600)&&number(c.end,0.1,600)&&Number(c.end)>Number(c.start)),
 ...(state?{sourceDuration:(v:unknown)=>number(v,0.1,86400)}:{})
 })};
 return Object.entries(value).every(([k,v])=>Object.hasOwn(rules,k)&&rules[k](v));
}
export function validEditorTiming(current:VideoEditorState,changes:VideoEditorChanges){
 const start=changes.start??current.start??0,duration=changes.duration??current.duration??current.sourceDuration;
 if(start+duration>current.sourceDuration+0.001)return false;
 let end=0;for(const c of changes.captions??[]){if(c.start<end||c.end>duration)return false;end=c.end;}
 for(const layer of changes.layers??[]){const original=current.layers?.find(l=>l.index===layer.index);if(!original)return false;const a=layer.start??original.start??0,b=layer.end??Math.min(original.end??duration,duration);if(a>=b||b>duration)return false;}
 return true;
}
