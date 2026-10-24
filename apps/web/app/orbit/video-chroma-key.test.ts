import { describe, expect, it } from 'vitest';
import { defaultVideoChromaKey, validateVideoChromaKey } from './video-chroma-key';
import { validateVideoEdit, type LocalVideoEdit } from './local-video-export';
describe('local chroma-key boundaries', () => {
  it('accepts explicit green/blue key settings and an existing background layer', () => {
    expect(()=>validateVideoChromaKey(defaultVideoChromaKey)).not.toThrow();
    expect(()=>validateVideoChromaKey({...defaultVideoChromaKey,color:'#0000ff',tolerance:.8,feather:0,spill:0})).not.toThrow();
    const edit: LocalVideoEdit = {start:0,duration:2,width:640,height:360,speed:1,volume:0,rotation:0,flip:false,captions:[],chromaKey:{...defaultVideoChromaKey,backgroundLayerId:'background'},overlays:[{id:'background',src:'blob:background',x:0,y:0,width:1,opacity:1,start:0,end:2}]};
    expect(()=>validateVideoEdit(edit)).not.toThrow();
    expect(()=>validateVideoEdit({...edit,overlays:[]})).toThrow('existing image layer');
  });
  it.each([{color:'green'},{background:'url(https://example.test)'},{tolerance:NaN},{tolerance:-.01},{tolerance:.81},{feather:Infinity},{feather:.41},{spill:-1},{spill:1.1},{backgroundLayerId:3},{backgroundLayerId:''}])('rejects malformed settings %j', changes => {
    expect(()=>validateVideoChromaKey({...defaultVideoChromaKey,...changes} as typeof defaultVideoChromaKey)).toThrow('green-screen');
  });
});
