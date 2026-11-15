#!/usr/bin/env node
/**
 * node scripts/render.mjs            → out/final.mp4 (1080x1920, H.264 + AAC, -14 LUFS)
 * node scripts/render.mjs --preview  → out/preview.mp4 (half size) + out/frames/*.png (full-res stills per scene)
 */
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'out');
const preview = process.argv.includes('--preview');
fs.mkdirSync(OUT, {recursive: true});

// ── 1. optional music / SFX (only local files; nothing is downloaded) ──
const firstExisting = (cands) => cands.find((c) => fs.existsSync(path.join(PUB, c))) ?? null;
const assets = {
  music: firstExisting(['music.mp3']),
  sfx: Object.fromEntries(
    ['whoosh', 'pop']
      .map((n) => [n, firstExisting(['mp3', 'wav', 'ogg', 'm4a'].map((e) => `sfx/${n}.${e}`))])
      .filter(([, v]) => v),
  ),
};
fs.writeFileSync(path.join(ROOT, 'src/generated/assets.json'), JSON.stringify(assets, null, 2));
console.log('music:', assets.music ?? '(none → no music)', '| sfx:', Object.keys(assets.sfx).join(', ') || '(none → skipped)');

// ── 2. bundle + composition ──
const browserExecutable =
  process.env.REMOTION_BROWSER ||
  ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find((p) =>
    fs.existsSync(p),
  ) ||
  null;
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
const common = {serveUrl, browserExecutable, chromiumOptions: {gl: 'swangle'}, timeoutInMilliseconds: 120000};
const composition = await selectComposition({...common, id: 'FinanceReel'});
console.log(`composition ${composition.width}x${composition.height} ${composition.durationInFrames}f @${composition.fps} = ${(composition.durationInFrames / composition.fps).toFixed(2)}s`);

let lastPct = -1;
const onProgress = ({progress}) => {
  const p = Math.floor(progress * 20) * 5;
  if (p !== lastPct) process.stdout.write(`  ${p}%`), (lastPct = p);
};

if (preview) {
  await renderMedia({...common, composition, codec: 'h264', audioCodec: 'aac', scale: 0.5, crf: 28, outputLocation: path.join(OUT, 'preview.mp4'), onProgress, concurrency: 4});
  console.log('\n→ out/preview.mp4');
  // full-res stills at the key moments of every scene
  const tl = JSON.parse(fs.readFileSync(path.join(PUB, 'voice/timeline.json'), 'utf8'));
  const dir = path.join(OUT, 'frames');
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  for (const s of tl.scenes) {
    const a = Math.round((s.startMs / 1000) * 30);
    const b = Math.round((s.endMs / 1000) * 30);
    for (const q of [0.3, 0.6, 0.9]) {
      const frame = Math.round(a + (b - a) * q);
      const file = path.join(dir, `${s.id}_${String(frame).padStart(4, '0')}.png`);
      await renderStill({...common, composition, frame, output: file});
    }
  }
  console.log('→ out/frames/');
  process.exit(0);
}

// ── 3. final render ──
const raw = path.join(OUT, 'final.raw.mp4');
await renderMedia({
  ...common,
  composition,
  codec: 'h264',
  audioCodec: 'aac',
  audioBitrate: '192k',
  crf: 18,
  pixelFormat: 'yuv420p',
  x264Preset: 'medium',
  outputLocation: raw,
  onProgress,
  concurrency: 4,
});
console.log('\nrendered', raw);

// ── 4. loudness: bring the final mix to -14 LUFS (gain + true-peak limiter), +faststart ──
const measure = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {encoding: 'utf8'});
  const sum = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return {I: parseFloat(sum.match(/I:\s+(-?[\d.]+)/)[1]), TP: parseFloat((sum.match(/Peak:\s+(-?[\d.]+)/) || [0, 0])[1])};
};
const final = path.join(OUT, 'final.mp4');
let m = measure(raw);
let gain = -14 - m.I;
for (let i = 0; i < 4; i++) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:v', 'copy', '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.86:attack=2:release=60:level=false`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', final]);
  m = measure(final);
  if (Math.abs(m.I + 14) < 0.2) break;
  gain += -14 - m.I;
}
fs.rmSync(raw);
console.log(`→ out/final.mp4  loudness ${m.I} LUFS, true peak ${m.TP} dBFS`);
