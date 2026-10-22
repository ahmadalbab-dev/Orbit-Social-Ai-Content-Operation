import {afterEach,describe,expect,it,vi} from 'vitest';
import {prepareVideoOverlay,videoOverlaySize} from './video-overlay-image';
afterEach(()=>vi.unstubAllGlobals());
describe('bounded video overlays',()=>{
 it.each([[4032,3024],[4000,4000],[16000,1000],[1000,16000]])('reduces %sx%s while preserving its aspect', (width,height)=>{
  const size=videoOverlaySize(width,height);
  expect(size.width*size.height).toBeLessThanOrEqual(4_000_000);
  expect(Math.max(size.width,size.height)).toBeLessThanOrEqual(4096);
  expect(size.width/size.height).toBeCloseTo(width/height,1);
 });
 it('retains small overlays and rejects unsupported dimension budgets',()=>{
  expect(videoOverlaySize(1200,800)).toEqual({width:1200,height:800});
  for(const pair of [[0,2],[Infinity,2],[1.5,2],[5000,4000]])expect(()=>videoOverlaySize(...pair as [number,number])).toThrow();
 });
 it('retains only the resized URL for preview AND export',async()=>{
  const revoke=vi.fn(),draw=vi.fn(),create=vi.fn().mockReturnValueOnce('blob:original').mockReturnValueOnce('blob:resized');
  vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:revoke});
  vi.stubGlobal('Image',class{src='';naturalWidth=4032;naturalHeight=3024;async decode(){if(this.src==='blob:resized'){this.naturalWidth=2309;this.naturalHeight=1732;}}});
  const canvas={width:0,height:0,getContext:()=>({drawImage:draw}),toBlob:(done:(b:Blob)=>void)=>done(new Blob(['resized']))};
  vi.stubGlobal('document',{createElement:()=>canvas});
  const result=await prepareVideoOverlay(new File(['image'],'photo.png',{type:'image/png'}));
  expect(result).toMatchObject({src:'blob:resized',resized:true});expect(draw).toHaveBeenCalledOnce();
  expect(revoke.mock.calls).toEqual([['blob:original']]);expect(canvas.width).toBe(0);
 });
 it('cleans up decode failure and reports the actual cause',async()=>{
  const revoke=vi.fn();vi.stubGlobal('URL',{createObjectURL:()=> 'blob:broken',revokeObjectURL:revoke});
  vi.stubGlobal('Image',class{src='';async decode(){throw Error('decode');}});
  await expect(prepareVideoOverlay(new File(['bad'],'bad.png',{type:'image/png'}))).rejects.toThrow('could not be decoded');
  expect(revoke).toHaveBeenCalledWith('blob:broken');
  await expect(prepareVideoOverlay(new File(['heic'],'photo.heic',{type:'image/heic'}))).rejects.toThrow('PNG, JPEG or WebP');
 });
});
