import { readFile } from 'node:fs/promises';
import { renderVideo } from './index.js';

// Operator-only CLI. API routes should enqueue jobs rather than start long renders inline.
async function main() {
  const [root, filename] = process.argv.slice(2);
  if (!root || !filename) {
    console.error('Usage: node dist/cli.js MEDIA_ROOT JOB_JSON');
    process.exitCode = 2;
  } else {
    const abort = new AbortController();
    process.once('SIGINT', () => abort.abort());
    process.once('SIGTERM', () => abort.abort());
    try {
      const raw = await readFile(filename);
      if (raw.byteLength > 65536) throw new Error('Job file too large');
      const result = await renderVideo(JSON.parse(raw.toString('utf8')), root, { signal: abort.signal });
      console.log(JSON.stringify(result));
    } catch {
      console.error('Render failed. Check job validation, local media and worker configuration.');
      process.exitCode = 1;
    }
  }
}
void main();
