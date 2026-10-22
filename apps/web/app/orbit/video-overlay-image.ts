export function videoOverlaySize(width:number,height:number){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('This image has invalid dimensions.');
 if(width*height>16_000_000)throw Error('Choose an overlay below 16 megapixels.');
 const scale=Math.min(1,Math.sqrt(4_000_000/(width*height)),4096/width,4096/height);
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
async function decode(src:string){
 const image=new Image();image.src=src;
 try{await image.decode();}catch{throw Error('This image could not be decoded. Try exporting it as PNG, JPEG or WebP.');}
 return image;
}
export async function prepareVideoOverlay(file:File){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Use PNG, JPEG or WebP images up to 8 MB each.');
 let src=URL.createObjectURL(file),retained=false;
 try{
  let image=await decode(src);
  const size=videoOverlaySize(image.naturalWidth,image.naturalHeight),resized=size.width!==image.naturalWidth||size.height!==image.naturalHeight;
  if(resized){
   const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
   try{
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image resizing is unavailable in this browser.');
    ctx.drawImage(image,0,0,size.width,size.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('The overlay could not be resized.')),'image/png'));
    URL.revokeObjectURL(src);src=URL.createObjectURL(blob);image=await decode(src);
   }finally{canvas.width=canvas.height=0;}
  }
  // Export decodes this URL again; the editor owns it until removal/reset.
  retained=true;return {image,src,resized};
 }finally{if(!retained)URL.revokeObjectURL(src);}
}
