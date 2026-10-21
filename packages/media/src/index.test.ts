import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, symlink, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderVideo, validateRenderJob } from './index';
const base = { input: 'in.mp4', output: 'out.mp4', duration: 0.5, format: 'portrait' } as const;
let available = false;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); available = true; } catch {}
describe('render boundary', () => {
  it('rejects unbounded duration, invalid format, controls and invalid caption timing', () => {
    for (const patch of [{ duration: 121 }, { duration: NaN }, { format: 'arbitrary' }, { news: { title: '\u0000', date: 'today' } }, { captions: [{ text: 'hello', start: 0.4, end: 0.1 }] }]) expect(() => validateRenderJob({ ...base, ...patch })).toThrow();
  });
  it('rejects traversal, remote sources, absolute paths and symlink escapes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'orbit-media-test-'));
    try {
      for (const input of ['../in.mp4', '/tmp/in.mp4', 'https://example.org/in.mp4', 'file:in.mp4', 'a\\in.mp4']) await expect(renderVideo({ ...base, input }, root)).rejects.toThrow();
      await symlink(os.tmpdir(), path.join(root, 'outside'));
      await writeFile(path.join(root, 'in.mp4'), 'placeholder');
      await expect(renderVideo({ ...base, output: 'outside/out.mp4' }, root)).rejects.toThrow('outside root');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('honours cancellation without running a provider or creating an output', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'orbit-media-test-'));
    try {
      await writeFile(path.join(root, 'in.mp4'), 'placeholder');
      const abort = new AbortController(); abort.abort();
      await expect(renderVideo(base, root, { signal: abort.signal })).rejects.toThrow();
      expect(await readdir(root)).toEqual(['in.mp4']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it.skipIf(!available)('renders actual MP4, treating filter syntax as literal text, and refuses overwrite', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'orbit-media-test-'));
    try {
      execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x120:r=30', '-t', '1', '-threads', '1', '-pix_fmt', 'yuv420p', path.join(root, 'in.mp4')]);
      const result = await renderVideo({ ...base, news: { title: "Orbit: 'hello' %{metadata:secret} \\ [x];", date: '15 Oktober 2026' }, captions: [{ text: 'Caption: %{n}', start: 0, end: 0.4 }] }, root);
      expect(result.width).toBe(720);
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', path.join(root, 'out.mp4')], { encoding: 'utf8' }));
      expect(probe.streams[0]).toMatchObject({ codec_name: 'h264', width: 720, height: 1280 });
      const before = await readFile(path.join(root, 'out.mp4'));
      await expect(renderVideo(base, root)).rejects.toThrow('already exists');
      expect(await readFile(path.join(root, 'out.mp4'))).toEqual(before);
      expect((await readdir(root)).sort()).toEqual(['in.mp4', 'out.mp4']);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 30000);
});
