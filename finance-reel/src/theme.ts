import {Easing, interpolate, spring} from 'remotion';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  navy: '#0F172A',
  navy2: '#16213A',
  card: '#1A2540',
  line: '#2B3A5A',
  mint: '#34D399',
  mintDim: 'rgba(52,211,153,0.16)',
  red: '#F87171',
  redDim: 'rgba(248,113,113,0.16)',
  white: '#FFFFFF',
  muted: '#94A3B8',
  slate: '#CBD5E1',
  warm1: '#FDBA74',
  warm2: '#F59E0B',
};

export const FONT = "'Noto Sans Thai', 'Inter', 'Noto Color Emoji', sans-serif";

/** Safe zone: top 250, bottom 400, right 150 (plus a small left margin). */
export const SAFE = {top: 250, bottom: H - 400, left: 72, right: W - 150};
export const CX = (SAFE.left + SAFE.right) / 2;

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Clamped interpolate with an ease (never plain linear). */
export const ease = (
  f: number,
  input: [number, number],
  output: [number, number],
  easing = EASE_OUT,
) =>
  interpolate(f, input, output, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const pop = (f: number, at: number, cfg?: {damping?: number; stiffness?: number; mass?: number}) =>
  spring({
    frame: f - at,
    fps: FPS,
    config: {damping: 13, stiffness: 190, mass: 0.8, ...cfg},
  });

/** Kinetic "slam-in": big → normal with a hard spring. */
export const slam = (f: number, at: number) => {
  const s = spring({frame: f - at, fps: FPS, config: {damping: 15, stiffness: 320, mass: 0.9}});
  return {
    transform: `scale(${interpolate(s, [0, 1], [2.6, 1])})`,
    opacity: interpolate(s, [0, 0.18], [0, 1], {extrapolateRight: 'clamp'}),
    filter: `blur(${interpolate(s, [0, 0.6], [14, 0], {extrapolateRight: 'clamp'})}px)`,
  } as const;
};

/** Damped shake offset after an impact at `at`. */
export const shake = (f: number, at: number, amp = 14) => {
  const t = f - at;
  if (t < 0 || t > 18) return {x: 0, y: 0};
  const k = Math.exp(-t / 5) * amp;
  return {x: Math.sin(t * 2.7) * k, y: Math.cos(t * 3.3) * k * 0.6};
};

export const baht = (n: number) => '฿' + Math.round(n).toLocaleString('en-US');
