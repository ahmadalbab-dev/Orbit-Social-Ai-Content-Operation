// Representative static connecting frame for favicon/PWA surfaces that cannot animate.
// Geometry: thinking-orbs 0.3.2 (MIT); see docs/licenses/THINKING_ORBS_MIT.txt.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url));
const { MODE_FRAMES, resolvePreset }=require('thinking-orbs/engine');
const preset=resolvePreset('connecting',64),frame=MODE_FRAMES[preset.mode](64,.6,preset.opts);
const ink=white=>`rgb(${Array(3).fill(Math.round((1-white)*255)).join(',')})`;
const lines=frame.lines.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${ink(l.white)}" stroke-width="${l.w}" opacity="${l.a??1}"/>`).join('');
const dots=frame.dots.map(d=>`<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${ink(d.white)}" opacity="${d.a??1}"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Orbit</title><rect width="64" height="64" rx="16" fill="#151516"/><g transform="translate(4 4) scale(.875)">${lines}${dots}</g></svg>\n`;
for(const path of ['../apps/web/app/icon.svg','../apps/web/public/icon.svg'])writeFileSync(new URL(path,import.meta.url),svg);
// Reuse Next.js's existing pinned image dependency; no new runtime package.
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]){
  await sharp(Buffer.from(svg)).resize(size,size).png().toFile(fileURLToPath(new URL(`../apps/web/public/${name}`,import.meta.url)));
}
