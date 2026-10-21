import { expect, it } from 'vitest';
import { imageMotionFrame, imageMotionInstruction, pixelImageInstruction } from './image-motion';
it('routes the customer instruction to camera motion without claiming generated subject animation', () => {
  expect(imageMotionInstruction('Make the screen moving')).toBe('zoom-in');
  expect(imageMotionInstruction('Gerakkan gambar ke kiri')).toBe('pan-left');
  expect(imageMotionInstruction('Zoom this photo out')).toBe('zoom-out');
  for (const instruction of ["Don't make the screen moving", 'Make the person in this image dance', 'Replace the image background', 'Make the music louder', 'Create a new background and make the image moving']) expect(imageMotionInstruction(instruction)).toBeNull();
});
it('moves existing pixels while covering the full frame and clamps invalid progress', () => {
  expect(imageMotionFrame(200,100,'none',1)).toEqual({x:0,y:0,width:200,height:100});
  expect(imageMotionFrame(200,100,'zoom-in',1).width).toBeCloseTo(224);
  expect(imageMotionFrame(200,100,'pan-left',1).x).toBeCloseTo(-24);
  for (const motion of ['zoom-in','zoom-out','pan-left','pan-right'] as const) for (const t of [-10,0,.5,1,100,NaN]) {
    const frame=imageMotionFrame(200,100,motion,t);
    expect(frame.x).toBeLessThanOrEqual(0);expect(frame.y).toBeLessThanOrEqual(0);
    expect(frame.x+frame.width).toBeGreaterThanOrEqual(199.999);expect(frame.y+frame.height).toBeGreaterThanOrEqual(99.999);
  }
});

it('routes real pixel edits while keeping editable canvas colours with the planner',()=>{
  for (const instruction of ['Use a cream background','Make the background blue',"Don't remove the background",'Remove the caption']) expect(pixelImageInstruction(instruction)).toBe(false);
  for (const instruction of ['Replace the photo background with a beach','Remove the object','Turn this image into commercial product named ai studio by Orbit']) expect(pixelImageInstruction(instruction)).toBe(true);
});
