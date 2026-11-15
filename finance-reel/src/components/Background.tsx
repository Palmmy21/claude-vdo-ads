import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, EASE_IN_OUT, H, W, ease} from '../theme';
import {scene} from '../timeline';

const payoff = scene('payoff');
const cta = scene('cta');

/** 0 = navy, 1 = fully warm. Warms during PAYOFF, settles to a softer warm in CTA. */
export const warmth = (f: number) => {
  const up = ease(f, [payoff.start + 6, payoff.start + 150], [0, 1], EASE_IN_OUT);
  const down = ease(f, [cta.start - 4, cta.start + 50], [0, 0.55], EASE_IN_OUT);
  return Math.max(0, up - down);
};

const PARTICLES = new Array(46).fill(0).map((_, i) => ({
  x: random(`px${i}`) * W,
  y0: random(`py${i}`) * H,
  r: 2 + random(`pr${i}`) * 7,
  speed: 0.6 + random(`ps${i}`) * 1.6,
  drift: random(`pd${i}`) * Math.PI * 2,
  tw: 0.04 + random(`pt${i}`) * 0.08,
}));

export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const w = warmth(f);
  const gx = 540 + Math.sin(f / 70) * 220;
  const gy = 760 + Math.cos(f / 90) * 180;
  const gx2 = 540 + Math.cos(f / 85) * 260;
  const gy2 = 1500 + Math.sin(f / 65) * 140;
  const particleAlpha = interpolate(w, [0.05, 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.navy, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${gx}px ${gy}px, rgba(52,211,153,0.10), transparent 520px),
                       radial-gradient(circle at ${gx2}px ${gy2}px, rgba(96,125,190,0.16), transparent 600px)`,
        }}
      />
      {/* faint dot grid that slowly drifts: keeps the frame alive between beats */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.10) 2px, transparent 2.5px)',
          backgroundSize: '54px 54px',
          backgroundPosition: `${(f * 0.35) % 54}px ${(f * 0.6) % 54}px`,
          opacity: 1 - w * 0.7,
        }}
      />
      {/* warm sunrise for the PAYOFF */}
      <AbsoluteFill
        style={{
          opacity: w,
          background: 'linear-gradient(180deg, #2A1A2E 0%, #5B2C33 42%, #A0503A 78%, #D9824A 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: w,
          background: `radial-gradient(circle at 520px ${1500 - w * 220}px, rgba(253,186,116,0.55), transparent 760px)`,
        }}
      />
      {particleAlpha > 0 &&
        PARTICLES.map((p, i) => {
          const y = (((p.y0 - f * p.speed) % H) + H) % H;
          const x = p.x + Math.sin(f / 40 + p.drift) * 26;
          const tw = 0.45 + 0.55 * Math.sin(f * p.tw + p.drift);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: p.r * 2,
                height: p.r * 2,
                borderRadius: '50%',
                background: '#FFE7C2',
                boxShadow: `0 0 ${p.r * 4}px ${p.r}px rgba(253,186,116,0.6)`,
                opacity: particleAlpha * tw * 0.85,
              }}
            />
          );
        })}
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.38) 100%)'}} />
    </AbsoluteFill>
  );
};
