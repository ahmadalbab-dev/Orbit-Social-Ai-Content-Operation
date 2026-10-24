import { describe, expect, it } from 'vitest';
import { stitchIntroEdit, stitchedDuration, validateVideoStitch, type VideoStitchIntro } from './video-stitch';
import { validateVideoEdit, type LocalVideoEdit } from './local-video-export';
const intro:VideoStitchIntro={src:'blob:reference',name:'reference.mp4',start:1,duration:2,sourceDuration:10,volume:.5};
const edit:LocalVideoEdit={start:3,duration:6,speed:2,width:720,height:1280,volume:.8,rotation:90,flip:true,captions:[{text:'Response',start:0,end:2}]};
describe('two-clip sequential stitch boundaries',()=>{
  it('counts reference time at original speed and response time at its selected speed',()=>{
    expect(stitchedDuration(edit,intro)).toBe(5);
    expect(stitchedDuration(edit,null)).toBe(3);
    expect(()=>validateVideoEdit({...edit,intro})).not.toThrow();
  });
  it('keeps reference edits isolated while sharing the output frame',()=>{
    expect(stitchIntroEdit(edit,intro)).toEqual({start:1,duration:2,width:720,height:1280,speed:1,volume:.5,rotation:0,flip:false,captions:[]});
  });
  it.each([{src:'https://example.test/video.mp4'},{start:-1},{duration:0},{duration:31},{start:9,duration:2},{volume:NaN},{volume:1.1},{sourceDuration:Infinity}])('rejects unbounded/private-source bypass %j',patch=>{
    expect(()=>validateVideoStitch({...intro,...patch},edit)).toThrow('reference');
  });
  it('rejects combined output above 120 seconds including a slowed response',()=>{
    expect(()=>validateVideoStitch(intro,{duration:60,speed:.5})).toThrow('120');
    expect(()=>validateVideoStitch(intro,{duration:59,speed:.5})).not.toThrow();
  });
});
