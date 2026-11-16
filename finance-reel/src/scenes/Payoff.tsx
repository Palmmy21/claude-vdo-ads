import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {At, Headline} from '../components/Common';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, EASE_IN_OUT, ease, pop} from '../theme';
import {at} from '../timeline';

export const PAYOFF_CUES = {
  freedom: at('payoff', 'อิสรภาพ'),
  rich: at('payoff', 'รวยล้นฟ้า'),
  itIs: at('payoff', 'มันคือ'),
};
const c = PAYOFF_CUES;

// big line, typed word-by-word in sync with the voice
const LINE1 = [
  {w: 'ทำงาน', cue: at('payoff', 'ทำงาน')},
  {w: 'เพราะ', cue: at('payoff', 'เพราะ', {occurrence: 0})},
  {w: 'อยาก', cue: at('payoff', 'อยาก'), color: C.mint},
];
const LINE2 = [
  {w: 'ไม่ใช่', cue: at('payoff', 'ไม่ใช่')},
  {w: 'เพราะ', cue: at('payoff', 'เพราะ', {occurrence: 1})},
  {w: 'ต้อง', cue: at('payoff', 'ต้อง', {occurrence: 1}), color: '#FECACA'},
];
export const PAYOFF_WORD_CUES = [...LINE1, ...LINE2].map((x) => x.cue);

const Typed: React.FC<{f: number; words: typeof LINE1; size: number; caretOn: boolean}> = ({f, words, size, caretOn}) => (
  <div style={{display: 'flex', alignItems: 'center'}}>
    {words.map((x) => {
      const p = pop(f, x.cue - 1, {damping: 11, stiffness: 260, mass: 0.6});
      if (f < x.cue - 1) return null;
      return (
        <Headline
          key={x.w + x.cue}
          size={size}
          style={{
            display: 'inline-block',
            color: x.color ?? C.white,
            transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            opacity: interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          {x.w}
        </Headline>
      );
    })}
    {caretOn && <div style={{width: 8, height: size * 0.95, marginLeft: 10, borderRadius: 4, background: C.white, opacity: Math.floor(f / 8) % 2 ? 0.15 : 0.95}} />}
  </div>
);

export const Payoff: React.FC = () => {
  const f = useSceneFrame();
  const p1 = pop(f, c.freedom);
  const strike = ease(f, [c.rich + 4, c.rich + 18], [0, 1], EASE_IN_OUT);
  const up = ease(f, [c.itIs - 8, c.itIs + 8], [0, 1], EASE_IN_OUT);
  const lastCue = LINE2[2].cue;
  const caretLine = f < LINE2[0].cue - 1 ? 1 : 2;
  const breathe = 1 + 0.015 * Math.sin(f / 10);
  return (
    <AbsoluteFill>
      <At
        x={CX}
        y={interpolate(up, [0, 1], [620, 400])}
        style={{
          flexDirection: 'column',
          opacity: interpolate(p1, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'}) * interpolate(up, [0, 1], [1, 0.75]),
          transform: `translate(-50%, -50%) scale(${interpolate(up, [0, 1], [1, 0.72])})`,
        }}
      >
        <Headline size={86} style={{transform: `translateY(${interpolate(p1, [0, 1], [50, 0])}px)`}}>
          อิสรภาพทางการเงิน
        </Headline>
        <div style={{position: 'relative', opacity: ease(f, [c.rich - 3, c.rich + 4], [0, 1])}}>
          <Headline size={80} style={{color: '#FDE68A'}}>
            ≠ รวยล้นฟ้า
          </Headline>
          <div style={{position: 'absolute', left: '-2%', top: '52%', height: 9, borderRadius: 5, width: `${strike * 104}%`, background: C.red}} />
        </div>
      </At>

      {f >= LINE1[0].cue - 1 && (
        <At x={CX} y={800} style={{flexDirection: 'column', gap: 6, transform: `translate(-50%, -50%) scale(${breathe})`}}>
          <Typed f={f} words={LINE1} size={104} caretOn={caretLine === 1} />
          <Typed f={f} words={LINE2} size={104} caretOn={caretLine === 2 && f < lastCue + 40} />
        </At>
      )}
    </AbsoluteFill>
  );
};
