"use client";
import { Button } from './ui';
import type { VideoChromaKey } from './video-chroma-key';
export function VideoChromaControls({draft, onChange, disabled, active, previewing, canUndo, backgrounds, onPreview, onStopPreview, onApply, onRemove, onUndo}: {
  draft: VideoChromaKey; onChange: (value: VideoChromaKey) => void; disabled: boolean;
  active: boolean; previewing: boolean; canUndo: boolean; backgrounds: {id:string; label:string}[];
  onPreview: () => void; onStopPreview: () => void; onApply: () => void; onRemove: () => void; onUndo: () => void;
}) {
  return <section aria-label="Local green screen" className="small-details">
    <h3>Green screen</h3>
    <p className="review-help">Remove a green or blue backdrop from this video, then replace it with a colour or an uploaded image layer. This is colour keying, not AI subject cutout. Processing stays on this device.</p>
    <div className="two-fields">
      <label className="field">Backdrop colour<input aria-label="Green-screen key colour" type="color" value={draft.color} disabled={disabled} onChange={event=>onChange({...draft,color:event.target.value})}/></label>
      <label className="field">Replacement colour<input aria-label="Green-screen background colour" type="color" value={draft.background} disabled={disabled} onChange={event=>onChange({...draft,background:event.target.value})}/></label>
    </div>
    <label className="field">Background image<select aria-label="Green-screen background image" value={draft.backgroundLayerId ?? ''} disabled={disabled} onChange={event=>onChange({...draft,backgroundLayerId:event.target.value || null})}><option value="">Replacement colour</option>{backgrounds.map(background=><option key={background.id} value={background.id}>{background.label}</option>)}</select></label>
    {draft.backgroundLayerId ? <p className="review-help">The selected image fills the background during its layer timing. Its opacity still applies.</p> : null}
    {([['Tolerance','tolerance',.8],['Edge feather','feather',.4],['Colour spill','spill',1]] as const).map(([label,key,max])=><label className="field" key={key}>{label}<input aria-label={`Green-screen ${key}`} type="range" min="0" max={max} step=".01" value={draft[key]} disabled={disabled} onChange={event=>onChange({...draft,[key]:Number(event.target.value)})}/><output>{Math.round(draft[key]*100)}%</output></label>)}
    <div className="editor-ai-actions">
      <Button variant="outline" disabled={disabled} onClick={onPreview}>Preview green screen</Button>
      {previewing ? <Button variant="outline" disabled={disabled} onClick={onStopPreview}>Stop green-screen preview</Button> : null}
      <Button disabled={disabled} onClick={onApply}>Apply green screen</Button>
      {active ? <Button variant="outline" disabled={disabled} onClick={onRemove}>Remove green screen</Button> : null}
      {canUndo ? <Button variant="outline" disabled={disabled} onClick={onUndo}>Undo green screen</Button> : null}
    </div>
    {previewing ? <p role="status">Preview only. Apply green screen before exporting.</p> : active ? <p role="status">Green screen is included in local exports.</p> : null}
  </section>;
}
