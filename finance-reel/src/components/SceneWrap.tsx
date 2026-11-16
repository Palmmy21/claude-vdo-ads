import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, W, H} from '../theme';

/** Each scene's Sequence starts PAD frames early and ends PAD frames late, so
 *  neighbouring scenes overlap for a 2*PAD (=10 frame) transition. */
export const PAD = 5;
export const TRANS = PAD * 2;

export type TransitionKind = 'whipLeft' | 'whipUp' | 'scaleBlur';

/** Frame inside a scene: 0 = the scene's real start on the voice timeline. */
export const useSceneFrame = () => useCurrentFrame() - PAD;

const styleFor = (kind: TransitionKind, p: number, dir: 'in' | 'out'): React.CSSProperties => {
  // p: 0 → 1 over the transition. For 'in' the scene arrives, for 'out' it leaves.
  const q = dir === 'in' ? 1 - p : p; // 0 = resting, 1 = fully away
  const blur = interpolate(q, [0, 1], [0, 26]);
  switch (kind) {
    case 'whipLeft': {
      const x = dir === 'in' ? q * W : -q * W;
      return {transform: `translateX(${x}px) skewX(${(dir === 'in' ? -1 : 1) * q * 8}deg)`, filter: `blur(${blur}px)`};
    }
    case 'whipUp': {
      const y = dir === 'in' ? q * H * 0.6 : -q * H * 0.6;
      return {transform: `translateY(${y}px)`, filter: `blur(${blur}px)`, opacity: 1 - q * 0.6};
    }
    case 'scaleBlur':
    default: {
      const s = dir === 'in' ? interpolate(q, [0, 1], [1, 0.82]) : interpolate(q, [0, 1], [1, 1.28]);
      return {transform: `scale(${s})`, filter: `blur(${blur}px)`, opacity: 1 - q};
    }
  }
};

export const SceneWrap: React.FC<{
  dur: number; // the scene's own length (without padding)
  enter?: TransitionKind;
  exit?: TransitionKind;
  children: React.ReactNode;
}> = ({dur, enter, exit, children}) => {
  const f = useCurrentFrame(); // 0 .. dur + 2*PAD
  let style: React.CSSProperties = {};
  if (enter && f < TRANS) {
    style = styleFor(enter, interpolate(f, [0, TRANS], [0, 1], {easing: EASE_IN_OUT, extrapolateRight: 'clamp'}), 'in');
  } else if (exit && f > dur) {
    style = styleFor(exit, interpolate(f, [dur, dur + TRANS], [0, 1], {easing: EASE_IN_OUT, extrapolateRight: 'clamp'}), 'out');
  }
  return <AbsoluteFill style={{...style, willChange: 'transform'}}>{children}</AbsoluteFill>;
};
