import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame} from 'remotion';
import {C, CX, FPS, SAFE} from '../theme';
import {Chunk, TL, charTimes, msToF} from '../timeline';

type Word = {text: string; start: number; end: number; spaceBefore: boolean};
type Group = {words: Word[]; start: number; end: number};

// Thai combining marks take no horizontal space.
const COMBINING = /[ัิ-ฺ็-๎]/g;
const visLen = (s: string) => s.replace(COMBINING, '').length;

const segmenter = new Intl.Segmenter('th', {granularity: 'word'});

const chunkWords = (c: Chunk): Word[] => {
  const ct = charTimes(c);
  const out: Word[] = [];
  let space = false;
  for (const seg of segmenter.segment(c.text)) {
    const txt = seg.segment;
    if (!txt.trim()) {
      space = true;
      continue;
    }
    const s = ct.s[seg.index];
    const e = ct.e[seg.index + txt.length - 1];
    if (!seg.isWordLike && out.length) {
      // punctuation / ๆ / … sticks to the previous word
      const prev = out[out.length - 1];
      prev.text += txt;
      prev.end = Math.max(prev.end, e);
    } else {
      out.push({text: txt, start: s, end: e, spaceBefore: space});
    }
    space = false;
  }
  return mergeCompounds(out);
};

// Words ICU tends to over-split; keep them as one subtitle word.
const KEEP = new Set(['แชท', 'คอมเมนต์', 'ป้านวล', 'เหมียวจด', 'รายได้', 'รายจ่าย', 'วันนี้', 'ตอนนี้', 'ตัวช่วย', 'ใช้จ่าย', 'เท่ากัน', 'ล้นฟ้า', 'เงินเก็บ', 'เท่าเดิม', 'สิ้นเดือน', 'ลงทุน', 'ทางการเงิน']);

function mergeCompounds(ws: Word[]): Word[] {
  const out: Word[] = [];
  for (const w of ws) {
    const prev = out[out.length - 1];
    if (prev && !w.spaceBefore && (visLen(w.text) === 1 && /[\u0E00-\u0E7F]/.test(w.text) || KEEP.has(prev.text + w.text))) {
      prev.text += w.text;
      prev.end = Math.max(prev.end, w.end);
      // a merge can complete a KEEP word with the previous one too (คอม + เมนต์)
      const pp = out[out.length - 2];
      if (pp && !prev.spaceBefore && KEEP.has(pp.text + prev.text)) {
        pp.text += prev.text;
        pp.end = prev.end;
        out.pop();
      }
      continue;
    }
    if (prev && !w.spaceBefore && KEEP.has(prev.text + w.text)) continue;
    out.push({...w});
  }
  // second pass for pairs formed after the first merge
  const res: Word[] = [];
  for (const w of out) {
    const prev = res[res.length - 1];
    if (prev && !w.spaceBefore && KEEP.has(prev.text + w.text)) {
      prev.text += w.text;
      prev.end = Math.max(prev.end, w.end);
    } else res.push(w);
  }
  return res;
}

const MAX_WORDS = 4;
const MAX_CHARS = 14;

const wlen = (ws: Word[]) => ws.reduce((a, w) => a + visLen(w.text), 0);

/** Split one phrase into k balanced groups (by visual length), 2-4 words each where possible. */
const splitBalanced = (ws: Word[]): Word[][] => {
  const k = Math.max(1, Math.ceil(ws.length / MAX_WORDS), Math.ceil(wlen(ws) / MAX_CHARS));
  if (k === 1) return [ws];
  const target = wlen(ws) / k;
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (let i = 0; i < ws.length; i++) {
    const groupsLeft = k - out.length;
    if (
      cur.length &&
      (cur.length >= MAX_WORDS || groupsLeft > 1 && wlen(cur) + visLen(ws[i].text) / 2 > target)
    ) {
      out.push(cur);
      cur = [];
    }
    cur.push(ws[i]);
  }
  out.push(cur);
  return out;
};

const groupWords = (words: Word[]): Word[][] => {
  // 1) phrases = runs separated by spaces in the script (natural spoken phrases)
  const phrases: Word[][] = [];
  for (const w of words) {
    if (!phrases.length || w.spaceBefore) phrases.push([]);
    phrases[phrases.length - 1].push(w);
  }
  // 2) glue short phrases to the next/previous one when the result still fits
  const merged: Word[][] = [];
  for (const ph of phrases) {
    const prev = merged[merged.length - 1];
    if (prev && (prev.length === 1 || ph.length === 1) && prev.length + ph.length <= MAX_WORDS && wlen(prev) + wlen(ph) <= MAX_CHARS) {
      prev.push(...ph);
    } else merged.push([...ph]);
  }
  // 3) long phrases → balanced groups
  const groups = merged.flatMap(splitBalanced);
  // 4) no lonely single words: join a neighbour, or borrow its last word
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length !== 1) continue;
    const prev = groups[i - 1];
    const next = groups[i + 1];
    const fits = (a: Word[], b: Word[]) => a.length + b.length <= MAX_WORDS && wlen(a) + wlen(b) <= MAX_CHARS + 2;
    if (prev && fits(prev, groups[i])) {
      prev.push(...groups[i]);
      groups.splice(i--, 1);
    } else if (next && fits(groups[i], next)) {
      next.unshift(...groups[i]);
      groups.splice(i--, 1);
    } else if (prev && prev.length >= 3) {
      groups[i].unshift(prev.pop()!);
    }
  }
  return groups;
};

export const GROUPS: Group[] = (() => {
  const all: Group[] = [];
  for (const s of TL.scenes)
    for (const b of s.beats)
      for (const c of b.chunks)
        for (const ws of groupWords(chunkWords(c))) {
          all.push({
            words: ws.map((w) => ({...w, start: msToF(w.start), end: msToF(w.end)})),
            start: msToF(ws[0].start),
            end: msToF(ws[ws.length - 1].end),
          });
        }
  // each group stays until the next one starts (or ~0.4 s after its last word)
  for (let i = 0; i < all.length; i++) {
    const next = all[i + 1];
    const hold = all[i].end + 12;
    all[i].end = next ? Math.min(Math.max(all[i].end + 2, next.start), hold) : hold;
  }
  return all;
})();

const SUB_Y = 1288; // top of the subtitle band (well above the 400 px bottom safe zone)

export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const g = GROUPS.find((x) => f >= x.start - 2 && f < x.end);
  if (!g) return null;
  const enter = spring({frame: f - (g.start - 2), fps: FPS, config: {damping: 16, stiffness: 240}});
  const chars = g.words.reduce((a, w) => a + visLen(w.text), 0);
  const fontSize = chars > 13 ? Math.round(74 * (13 / chars)) + 6 : 74;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: SUB_Y,
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          height: 170,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            whiteSpace: 'nowrap',
            padding: '6px 28px 10px',
            borderRadius: 28,
            background: 'rgba(8,13,28,0.55)',
            fontSize,
            fontWeight: 800,
            lineHeight: 1.6,
            transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
            opacity: interpolate(enter, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'}),
            maxWidth: SAFE.right - SAFE.left,
          }}
        >
          {g.words.map((w, i) => {
            const next = g.words[i + 1];
            const isActive = f >= w.start && (next ? f < next.start : f < w.end + 8);
            const bump = spring({frame: f - w.start, fps: FPS, config: {damping: 9, stiffness: 260, mass: 0.6}});
            const scale = isActive ? interpolate(bump, [0, 1], [1, 1.1]) : 1;
            const spoken = f >= w.start;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginLeft: i > 0 && w.spaceBefore ? '0.24em' : 0,
                  color: isActive ? C.mint : spoken ? C.white : 'rgba(255,255,255,0.72)',
                  transform: `scale(${scale})`,
                  transformOrigin: '50% 60%',
                  textShadow: isActive ? '0 0 28px rgba(52,211,153,0.45)' : '0 4px 18px rgba(0,0,0,0.5)',
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Center reference for layout debugging
export const SUB_CENTER = {x: CX, y: SUB_Y + 85};
