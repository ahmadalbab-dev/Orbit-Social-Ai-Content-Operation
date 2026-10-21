'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { boundedAudioFile, librarySounds, type LibrarySound } from './sound-library-api';
import './sound-library.css';
import { starterSounds } from './sound-library-starters';
export function SoundLibrary({ disabled, onChooseFile }: { disabled: boolean; onChooseFile: (file: File) => Promise<boolean> }) {
  const [query, setQuery] = useState('ambient');
  const [results, setResults] = useState<LibrarySound[]>(starterSounds), [selected, setSelected] = useState<LibrarySound | null>(starterSounds[0]);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const request = useRef<AbortController | null>(null), player = useRef<HTMLAudioElement>(null), alive = useRef(true);
  const current = useRef({ disabled, onChooseFile }); current.current = { disabled, onChooseFile };
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { if (disabled) { request.current?.abort(); player.current?.pause(); } }, [disabled]);
  useEffect(() => { const audio = player.current; if (!audio) return; const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) audio.pause(); }); observer.observe(audio); const hidden = () => { if (document.hidden) audio.pause(); }; document.addEventListener('visibilitychange', hidden); return () => { audio.pause(); observer.disconnect(); document.removeEventListener('visibilitychange', hidden); }; }, [selected]);
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (current.current.disabled || busy) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 25000); setBusy(true); setNotice('');
    try { await action(controller.signal); } catch (error) { if (alive.current) setNotice(controller.signal.aborted ? 'Sound request stopped. Try again when ready.' : error instanceof Error ? `${error.message} Included starter tracks remain available below.` : 'Live search is unavailable. Included starter tracks remain available below.'); }
    finally { clearTimeout(timer); if (alive.current) setBusy(false); }
  }
  async function search() { await run(async signal => {
    const params = new URLSearchParams({ q: query.trim().slice(0, 80) });
    const response = await fetch(`/api/music/search?${params}`, { signal, credentials: 'same-origin', redirect: 'error' });
    if (!response.ok) throw Error(response.status === 429 ? 'The public sound library reached its request limit. Try later or use local audio.' : 'Cannot reach the sound library. Try later or use local audio.');
    const body = await response.json(); const tracks = librarySounds(body); signal.throwIfAborted(); if (!alive.current) return;
    setResults([...starterSounds, ...tracks.filter(track => !starterSounds.some(starter => starter.source.replace(/\/$/, '') === track.source.replace(/\/$/, '')))]); setSelected(body.mode === 'starter' ? starterSounds[0] : null); setConfirmed(false); setNotice(body.mode === 'starter' ? 'Live music search is temporarily unavailable. The included CC0 starter tracks are ready to preview and use.' : tracks.length ? 'Choose a result to preview and review its source.' : 'No live matches found. Try another term or use an included starter track.');
  }); }
  return <details className="sound-library" open><summary>Search music &amp; sound library</summary>
    <p>Included CC0 starter tracks are ready to use. Search for more music and sounds from Freesound through Openverse, then check the source before using a track.</p>
    <form onSubmit={event => { event.preventDefault(); void search(); }}>
      <label className="field">Sound search<input aria-label="Sound library search" maxLength={80} value={query} onChange={event => setQuery(event.target.value)} disabled={disabled || busy}/></label>
      <Button type="submit" disabled={disabled || busy || !query.trim()}>{busy ? 'Loading sounds…' : 'Search sounds'}</Button>
    </form>
    {!results.length && !notice && !busy ? <p>Press Search sounds to browse playable music, then select a track to preview and use it.</p> : null}
    <div className="sound-library-results">{results.map(track => <button key={track.id} type="button" aria-pressed={selected?.id === track.id} disabled={disabled || busy} onClick={() => { setSelected(track); setConfirmed(false); }}><strong>{track.title}</strong><small>{track.creator} · CC0{track.id.startsWith('starter-') ? ' · Included' : ''}</small></button>)}</div>
    {selected ? <section aria-label="Selected library sound"><h4>{selected.title}</h4><audio ref={player} controls preload="none" crossOrigin="anonymous" src={selected.url} onError={() => setNotice("This sound cannot be played in this browser or the source is unavailable. Choose another result.")}/><p><a href={selected.source} target="_blank" rel="noreferrer">View original source</a> · <a href={selected.license} target="_blank" rel="noreferrer">CC0 terms</a></p><label className="sound-library-confirm"><input type="checkbox" checked={confirmed} disabled={disabled || busy} onChange={event => setConfirmed(event.target.checked)}/>I checked the source and can use this sound.</label><Button disabled={disabled || busy || !confirmed} onClick={() => void run(async signal => { player.current?.pause(); const file = await boundedAudioFile(selected, signal); signal.throwIfAborted(); if (!alive.current || current.current.disabled) return; const accepted = await current.current.onChooseFile(file); if (alive.current && accepted) setNotice(`${selected.title} added to your local soundtrack.`); })}>Use this sound</Button></section> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <p className="sound-library-credit">Made using <a href="https://openverse.org/" target="_blank" rel="noreferrer">Openverse</a>. Not endorsed by Openverse. Live searches contact Openverse through Orbit. Live previews contact their source; included tracks play from Orbit. Your media is not uploaded.</p>
  </details>;
}
