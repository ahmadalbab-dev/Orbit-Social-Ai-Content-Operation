import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, link, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface Caption { text: string; start: number; end: number }
export interface RenderJob {
  input: string;
  output: string;
  start?: number;
  duration: number;
  format: 'portrait' | 'square' | 'landscape';
  news?: { title: string; date: string };
  captions?: Caption[];
}
export interface RenderOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Trusted administrator configuration only, never copy from a job request. */
  ffmpegPath?: string;
  ffprobePath?: string;
}
const dimensions = { portrait: [720, 1280], square: [1080, 1080], landscape: [1280, 720] } as const;
function number(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function text(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/u.test(value);
}
/** Validation runs again at the worker boundary, even when the API validated the job. */
export function validateRenderJob(value: unknown): RenderJob {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid render job');
  const j = value as RenderJob;
  if (!text(j.input, 512) || !text(j.output, 512) || !number(j.duration, 0.1, 120) || !number(j.start ?? 0, 0, 86400) || !Object.hasOwn(dimensions, j.format)) throw new Error('Invalid render job');
  if (j.news && (!text(j.news.title, 100) || !text(j.news.date, 40))) throw new Error('Invalid news overlay');
  if (j.captions !== undefined && (!Array.isArray(j.captions) || j.captions.length > 100 || j.captions.some(c => !c || !text(c.text, 120) || !number(c.start, 0, j.duration) || !number(c.end, 0, j.duration) || c.end <= c.start))) throw new Error('Invalid captions');
  return { input: j.input, output: j.output, start: j.start ?? 0, duration: j.duration, format: j.format,
    news: j.news ? { title: j.news.title, date: j.news.date } : undefined,
    captions: j.captions?.map(c => ({ text: c.text, start: c.start, end: c.end })) };
}
function within(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}
function localPath(root: string, name: string): string {
  // Reject protocols, absolute paths, traversal and platform-dependent path separators.
  if (path.isAbsolute(name) || name.includes(':') || name.includes('\\') || name.split('/').includes('..')) throw new Error('Local media paths required');
  const resolved = path.resolve(root, name);
  if (!within(root, resolved)) throw new Error('Media path outside root');
  return resolved;
}
async function run(binary: string, args: string[], cwd: string, timeout: number, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const process = spawn(binary, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let outputSize = 0; let failed = false;
    const kill = () => { failed = true; process.kill('SIGKILL'); };
    const timer = setTimeout(kill, timeout);
    const abort = () => kill();
    signal?.addEventListener('abort', abort, { once: true });
    process.stdout.on('data', (buffer: Buffer) => { outputSize += buffer.length; if (outputSize > 65536) kill(); else stdout += buffer.toString(); });
    // Drain but never expose FFmpeg stderr, which may include user content or paths.
    process.stderr.on('data', () => {});
    const clean = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    process.on('error', () => { clean(); reject(new Error('Media executable unavailable')); });
    process.on('close', code => { clean(); if (failed || signal?.aborted) reject(new Error('Render cancelled or resource limit reached')); else if (code !== 0) reject(new Error('Media processing failed')); else resolve(stdout); });
  });
}
function wrap(value: string, width: number): string {
  return value.match(new RegExp(`.{1,${width}}(?:\\s|$)|.{1,${width}}`, 'gu'))?.map(s => s.trim()).join('\n') ?? value;
}
/** Run only in an isolated worker with a tenant-specific root and OS CPU/memory limits. */
export async function renderVideo(value: unknown, rootDirectory: string, options: RenderOptions = {}): Promise<{ output: string; duration: number; width: number; height: number }> {
  const job = validateRenderJob(value);
  const root = await realpath(rootDirectory);
  const input = await realpath(localPath(root, job.input));
  const output = localPath(root, job.output);
  if (!within(root, input) || !within(root, await realpath(path.dirname(output))) && path.dirname(output) !== root) throw new Error('Media path outside root');
  if (path.extname(output).toLowerCase() !== '.mp4' || !['.mp4', '.mov', '.webm', '.mkv'].includes(path.extname(input).toLowerCase())) throw new Error('Unsupported media format');
  const source = await stat(input);
  if (!source.isFile() || source.size > 512 * 1024 * 1024) throw new Error('Input size limit exceeded');
  try { await access(output, constants.F_OK); throw new Error('Output already exists'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const timeout = options.timeoutMs ?? 180000;
  if (!number(timeout, 1, 300000)) throw new Error('Invalid render timeout');
  const started = Date.now();
  const remaining = () => { const left = timeout - (Date.now() - started); if (left <= 0) throw new Error('Render timeout'); return left; };
  const probe = JSON.parse(await run(options.ffprobePath ?? 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', input], root, Math.min(10000, remaining()), options.signal));
  const stream = probe.streams?.find((s: { codec_type?: string }) => s.codec_type === 'video');
  const sourceDuration = Number(probe.format?.duration);
  if (!stream || !number(stream.width, 1, 4096) || !number(stream.height, 1, 4096) || !number(sourceDuration, 0.1, 86400) || job.start! + job.duration > sourceDuration + 0.05) throw new Error('Invalid source video or trim range');
  const temporary = await mkdtemp(path.join(root, '.orbit-render-'));
  try {
    const [width, height] = dimensions[job.format];
    const filters = [`scale=${width}:${height}:force_original_aspect_ratio=decrease`, `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`, 'setsar=1'];
    let counter = 0;
    const overlay = async (content: string, style: string) => {
      const filename = `text-${counter++}.txt`;
      await writeFile(path.join(temporary, filename), content, { mode: 0o600 });
      // Only generated filenames and numeric layout enter filter expressions. User text is a file;
      // expansion=none prevents %{...}, quote, colon and backslash injection.
      filters.push(`drawtext=textfile=${filename}:expansion=none:fontcolor=white:${style}`);
    };
    if (job.news) {
      filters.push(`drawbox=x=0:y=ih*0.70:w=iw:h=ih*0.24:color=red@0.42:t=fill`);
      await overlay(job.news.date, `fontsize=24:x=36:y=h*0.72`);
      await overlay(wrap(job.news.title, job.format === 'portrait' ? 32 : 44), `fontsize=${job.format === 'portrait' ? 32 : 36}:x=36:y=h*0.77:line_spacing=8`);
    }
    for (const caption of job.captions ?? []) await overlay(wrap(caption.text, job.format === 'portrait' ? 36 : 52), `fontsize=28:x=(w-text_w)/2:y=h*0.55:box=1:boxcolor=black@0.6:boxborderw=10:enable='between(t,${caption.start},${caption.end})'`);
    const rendered = path.join(temporary, 'result.mp4');
    await run(options.ffmpegPath ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-protocol_whitelist', 'file', '-ss', String(job.start), '-i', input, '-t', String(job.duration), '-map', '0:v:0', '-map', '0:a:0?', '-vf', filters.join(','), '-threads', '2', '-filter_threads', '1', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-fs', '67108864', rendered], temporary, remaining(), options.signal);
    options.signal?.throwIfAborted();
    const renderedProbe = JSON.parse(await run(options.ffprobePath ?? 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', rendered], temporary, Math.min(10000, remaining()), options.signal));
    if (Math.abs(Number(renderedProbe.format?.duration) - job.duration) > 0.15) throw new Error('Incomplete render');
    // Atomic exclusive creation, never overwrite a concurrent output or symlink.
    await link(rendered, output);
    return { output: job.output, duration: job.duration, width, height };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
