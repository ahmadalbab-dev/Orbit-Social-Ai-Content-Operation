import type { LocalVideoEdit } from './local-video-export';
export type VideoStitchIntro = {src: string; name: string; start: number; duration: number; sourceDuration: number; volume: number};
export function stitchedDuration(edit: Pick<LocalVideoEdit,'duration'|'speed'>, intro?: VideoStitchIntro | null) {
  return (intro?.duration ?? 0) + edit.duration / edit.speed;
}
export function validateVideoStitch(intro: VideoStitchIntro, edit: Pick<LocalVideoEdit,'duration'|'speed'>) {
  if (!intro || typeof intro.src !== 'string' || !intro.src.startsWith('blob:') ||
    ![intro.start,intro.duration,intro.sourceDuration,intro.volume].every(Number.isFinite) ||
    intro.start < 0 || intro.duration < .1 || intro.duration > 30 || intro.sourceDuration <= 0 ||
    intro.start + intro.duration > intro.sourceDuration + .01 || intro.volume < 0 || intro.volume > 1 ||
    !Number.isFinite(stitchedDuration(edit,intro)) || stitchedDuration(edit,intro) > 120) {
    throw Error('Choose a reference clip of 0.1–30 seconds within its source and a combined stitch up to 120 seconds.');
  }
}
/** Reference stays unaltered; the response retains its own edits and sound. */
export function stitchIntroEdit(edit: Pick<LocalVideoEdit,'width'|'height'>, intro: VideoStitchIntro): LocalVideoEdit {
  return {start:intro.start,duration:intro.duration,width:edit.width,height:edit.height,speed:1,volume:intro.volume,rotation:0,flip:false,captions:[]};
}
