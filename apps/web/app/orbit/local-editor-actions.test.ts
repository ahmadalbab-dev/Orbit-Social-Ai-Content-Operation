import { describe, expect, it } from 'vitest';
import { uploadedBackgroundPlan } from './local-editor-actions';
const current={hasBaseImage:true,layers:[{index:0,x:50,y:50,width:40,opacity:100}]};
describe('uploaded background command',()=>{
 it('handles the customer instruction using the real existing second image',()=>{expect(uploadedBackgroundPlan('Create a background using second image overlay',current)?.changes).toEqual({backgroundLayerIndex:0});});
 it('does not invent missing images or override a negative or unrelated instruction',()=>{
  expect(uploadedBackgroundPlan('Use second image as background',{hasBaseImage:true,layers:[]})).toBeNull();
  expect(uploadedBackgroundPlan("Don't use second image as background",current)).toBeNull();
  expect(uploadedBackgroundPlan('Create a lightning background',current)).toBeNull();
 });
});
