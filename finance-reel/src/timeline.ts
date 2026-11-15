/**
 * Timing source of truth: public/voice/timeline.json, written by scripts/tts.py.
 * Scene lengths, beats and every visual cue are derived from the real voice audio.
 */
import data from '../public/voice/timeline.json';
import {FPS} from './theme';

export type Token = {text: string; charStart: number; charEnd: number; startMs: number; endMs: number};
export type Chunk = {text: string; startMs: number; endMs: number; pauseBeforeMs: number; tokens: Token[]};
export type Beat = {startMs: number; endMs: number; chunks: Chunk[]};
export type SceneData = {id: SceneId; startMs: number; endMs: number; beats: Beat[]};
export type SceneId = 'hook' | 'relate' | 'turn' | 'tools' | 'payoff' | 'cta';

export const TL = data as unknown as {
  totalMs: number;
  voiceFile: string;
  scenes: SceneData[];
};

export const msToF = (ms: number) => Math.round((ms * FPS) / 1000);
export const TOTAL_FRAMES = msToF(TL.totalMs);

/** Per-character start/end times (ms) for a chunk, interpolated inside each TTS token. */
const charCache = new Map<Chunk, {s: number[]; e: number[]}>();
export const charTimes = (c: Chunk) => {
  const hit = charCache.get(c);
  if (hit) return hit;
  const n = c.text.length;
  const s: number[] = new Array(n).fill(NaN);
  const e: number[] = new Array(n).fill(NaN);
  for (const t of c.tokens) {
    const len = Math.max(1, t.charEnd - t.charStart);
    for (let i = t.charStart; i < t.charEnd; i++) {
      const a = (i - t.charStart) / len;
      const b = (i - t.charStart + 1) / len;
      s[i] = t.startMs + (t.endMs - t.startMs) * a;
      e[i] = t.startMs + (t.endMs - t.startMs) * b;
    }
  }
  // fill gaps (spaces / punctuation) from neighbours
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(s[i])) {
      const prev = i > 0 ? e[i - 1] : c.startMs;
      s[i] = prev;
      e[i] = prev;
    }
  }
  const out = {s, e};
  charCache.set(c, out);
  return out;
};

export const scene = (id: SceneId) => {
  const sc = TL.scenes.find((x) => x.id === id);
  if (!sc) throw new Error('no scene ' + id);
  const start = msToF(sc.startMs);
  const end = msToF(sc.endMs);
  return {
    data: sc,
    start,
    end,
    dur: end - start,
    beats: sc.beats.map((b) => ({start: msToF(b.startMs) - start, end: msToF(b.endMs) - start})),
  };
};

/**
 * Local frame (relative to the scene start) where `phrase` is spoken.
 * occurrence: which match (0-based) within the scene (or beat); end: frame where it finishes.
 */
export const at = (
  id: SceneId,
  phrase: string,
  opts: {occurrence?: number; beat?: number; end?: boolean} = {},
): number => {
  const sc = scene(id);
  const beats = opts.beat === undefined ? sc.data.beats : [sc.data.beats[opts.beat]];
  let seen = 0;
  for (const b of beats) {
    for (const c of b.chunks) {
      let from = 0;
      for (;;) {
        const idx = c.text.indexOf(phrase, from);
        if (idx < 0) break;
        if (seen === (opts.occurrence ?? 0)) {
          const ct = charTimes(c);
          const ms = opts.end ? ct.e[idx + phrase.length - 1] : ct.s[idx];
          return msToF(ms) - sc.start;
        }
        seen++;
        from = idx + phrase.length;
      }
    }
  }
  throw new Error(`phrase "${phrase}" not found in scene ${id}`);
};

/** Merged intervals (ms) where the voice is speaking — used for music ducking. */
export const speechIntervals = (() => {
  const iv: [number, number][] = [];
  for (const s of TL.scenes)
    for (const b of s.beats)
      for (const c of b.chunks)
        for (const t of c.tokens) {
          const last = iv[iv.length - 1];
          if (last && t.startMs - last[1] < 300) last[1] = Math.max(last[1], t.endMs);
          else iv.push([t.startMs, t.endMs]);
        }
  return iv;
})();
