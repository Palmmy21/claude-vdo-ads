import React from 'react';
import {interpolate} from 'remotion';
import {C, EASE_IN_OUT, ease} from '../theme';
import {Coin} from './Icons';

/** Absolutely positioned box whose center is (x, y). */
export const At: React.FC<{x: number; y: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  x,
  y,
  style,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

const bez = (a: number, b: number, c: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

/** A stream of coins travelling along a quadratic curve from → to. */
export const CoinStream: React.FC<{
  f: number;
  from: [number, number];
  to: [number, number];
  ctrl?: [number, number];
  start: number;
  end: number;
  every?: number;
  travel?: number;
  size?: number;
  color?: string;
}> = ({f, from, to, ctrl, start, end, every = 6, travel = 20, size = 40, color}) => {
  const c = ctrl ?? [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 160];
  const coins: React.ReactNode[] = [];
  for (let s = start; s <= end; s += every) {
    const t = f - s;
    if (t < 0 || t > travel) continue;
    const p = ease(t, [0, travel], [0, 1], EASE_IN_OUT);
    const x = bez(from[0], c[0], to[0], p);
    const y = bez(from[1], c[1], to[1], p);
    const sc = interpolate(p, [0, 0.15, 0.85, 1], [0.4, 1, 1, 0.3]);
    coins.push(
      <div
        key={s}
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          transform: `scale(${sc}) rotate(${p * 360}deg)`,
          opacity: interpolate(p, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
        }}
      >
        <Coin size={size} color={color} />
      </div>,
    );
  }
  return <>{coins}</>;
};

/** Rounded pill label. */
export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({children, color = C.white, bg = 'rgba(255,255,255,0.08)', size = 40, style}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: `${size * 0.22}px ${size * 0.62}px ${size * 0.3}px`,
      borderRadius: 999,
      background: bg,
      color,
      fontSize: size,
      fontWeight: 600,
      lineHeight: 1.45,
      whiteSpace: 'nowrap',
      border: '2px solid rgba(255,255,255,0.08)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{style?: React.CSSProperties; size?: number; children: React.ReactNode}> = ({
  style,
  size = 108,
  children,
}) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 800,
      lineHeight: 1.45,
      color: C.white,
      whiteSpace: 'nowrap',
      letterSpacing: -1,
      textShadow: '0 10px 40px rgba(0,0,0,0.35)',
      ...style,
    }}
  >
    {children}
  </div>
);
