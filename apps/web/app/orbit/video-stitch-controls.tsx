"use client";
import { Button } from './ui';
import type { VideoStitchIntro } from './video-stitch';
export function VideoStitchControls({intro,onChoose,onChange,disabled,valid,enabled,previewing,canUndo,outputSeconds,onPreview,onStop,onApply,onRemove,onUndo}: {
  intro:VideoStitchIntro|null;onChoose:(file:File|undefined)=>void;onChange:(intro:VideoStitchIntro)=>void;
  disabled:boolean;valid:boolean;enabled:boolean;previewing:boolean;canUndo:boolean;outputSeconds:number;
  onPreview:()=>void;onStop:()=>void;onApply:()=>void;onRemove:()=>void;onUndo:()=>void;
}) {
  return <section aria-label="Local video stitch" className="small-details">
    <h3>Stitch a reference + response</h3>
    <p className="review-help">Choose a clip you can use, then play it before your edited video. Each clip keeps its source audio. Your captions, music and effects begin with your response. This is a local sequential stitch, not a connection to TikTok Stitch.</p>
    <label className="field">Reference video<input aria-label="Choose stitch reference video" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];event.target.value='';onChoose(file);}}/></label>
    {intro ? <>
      <p className="revision-label">{intro.name} · reference first, response second</p>
      <div className="two-fields">
        <label className="field">Reference start (seconds)<input aria-label="Stitch reference start" type="number" min="0" step=".1" value={intro.start} disabled={disabled} onChange={event=>onChange({...intro,start:Number(event.target.value)})}/></label>
        <label className="field">Reference length (seconds)<input aria-label="Stitch reference length" type="number" min=".1" max="30" step=".1" value={intro.duration} disabled={disabled} onChange={event=>onChange({...intro,duration:Number(event.target.value)})}/></label>
      </div>
      <label className="field">Reference volume<input aria-label="Stitch reference volume" type="range" min="0" max="1" step=".01" value={intro.volume} disabled={disabled} onChange={event=>onChange({...intro,volume:Number(event.target.value)})}/><output>{Math.round(intro.volume*100)}%</output></label>
      <p className="review-help">Combined output: {Number.isFinite(outputSeconds)?outputSeconds.toFixed(1):'—'} seconds. Reference up to 30 seconds; complete stitch up to 120 seconds. Both clips use the selected output frame.</p>
      {!valid ? <p role="status">Choose a valid reference trim and keep the combined stitch within 120 seconds.</p> : null}
      <div className="editor-ai-actions">
        <Button variant="outline" disabled={disabled||!valid} onClick={onPreview}>Preview stitched sequence</Button>
        {previewing ? <Button variant="outline" disabled={disabled} onClick={onStop}>Stop stitched preview</Button> : null}
        <Button disabled={disabled||!valid} onClick={onApply}>Apply stitch</Button>
        {enabled ? <Button variant="outline" disabled={disabled} onClick={onRemove}>Remove stitch</Button> : null}
        {canUndo ? <Button variant="outline" disabled={disabled} onClick={onUndo}>Undo stitch</Button> : null}
        <Button variant="outline" disabled={disabled} onClick={()=>onChoose(undefined)}>Remove reference video</Button>
      </div>
      {enabled ? <p role="status">Reference and response are included in local exports.</p> : null}
    </> : null}
    <small>Both original files stay on this device. Cancel stops both clips; replacing your response clears the reference.</small>
  </section>;
}
