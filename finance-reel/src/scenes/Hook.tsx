import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {At, Headline} from '../components/Common';
import {ArrowUp} from '../components/Icons';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, EASE_IN_OUT, ease, pop, shake, slam} from '../theme';
import {at} from '../timeline';

export const HOOK_CUES = {
  income: at('hook', 'รายได้'),
  savings: at('hook', 'เงินเก็บ'),
  same: at('hook', 'เท่าเดิม'),
};

const INCOME = 'M 70 440 C 220 430, 330 380, 430 300 S 640 120, 740 62';
const SAVINGS = 'M 70 452 L 740 452';
const CW = 810;
const CH = 560;

export const Hook: React.FC = () => {
  const f = useSceneFrame();
  const {income, savings, same} = HOOK_CUES;

  const incomeP = ease(f, [0, income + 34], [0.12, 1], EASE_IN_OUT);
  const savingsP = ease(f, [4, savings + 8], [0.08, 1], EASE_IN_OUT);
  const inc = evolvePath(incomeP, INCOME);
  const sav = evolvePath(savingsP, SAVINGS);

  // the flat savings line blinks once the voice says "เท่าเดิม"
  const blinkT = f - same;
  const blink = blinkT < 0 ? 1 : blinkT < 30 ? (Math.cos(blinkT * 0.75) > 0 ? 1 : 0.18) : 0.75 + 0.25 * Math.sin(f / 5);

  const sh = shake(f, savings, 16);
  const endDot = pop(f, income + 30);
  const zeroPulse = 1 + 0.06 * Math.max(0, Math.sin((f - savings) / 3)) * (f > savings + 10 ? 1 : 0);

  return (
    <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
      {/* kinetic headline */}
      <At x={CX} y={360}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, ...slam(f, Math.max(0, income - 3))}}>
          <Headline size={124}>รายได้</Headline>
          <ArrowUp size={104} style={{transform: `translateY(${-6 - 8 * Math.sin(f / 6)}px)`}} />
        </div>
      </At>
      <At x={CX} y={520}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26, ...slam(f, savings - 2)}}>
          <Headline size={124}>เงินเก็บ</Headline>
          <Headline size={124} style={{color: C.muted}}>
            =
          </Headline>
          <Headline size={136} style={{color: C.red, transform: `scale(${zeroPulse})`}}>
            0
          </Headline>
        </div>
      </At>

      {/* chart */}
      <div
        style={{
          position: 'absolute',
          left: CX - CW / 2,
          top: 650,
          width: CW,
          height: CH,
          borderRadius: 40,
          background: 'rgba(22,33,58,0.85)',
          border: `2px solid ${C.line}`,
          transform: `scale(${interpolate(pop(f, 0), [0, 1], [0.94, 1])})`,
          opacity: interpolate(pop(f, 0), [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={70} x2={760} y1={110 + i * 112} y2={110 + i * 112} stroke={C.line} strokeWidth={2} strokeDasharray="6 10" />
          ))}
          <line x1={70} x2={70} y1={60} y2={470} stroke={C.muted} strokeWidth={3} opacity={0.5} />
          {['ปีที่ 1', 'ปีที่ 2', 'ปีที่ 3', 'ปีที่ 4', 'ปีที่ 5'].map((t, i) => (
            <text key={t} x={95 + i * 160} y={520} fill={C.muted} fontSize={26} fontFamily="'Noto Sans Thai'" textAnchor="middle">
              {t}
            </text>
          ))}
          {/* income area glow */}
          <path d={INCOME} fill="none" stroke={C.mint} strokeWidth={22} strokeLinecap="round" opacity={0.18}
            strokeDasharray={inc.strokeDasharray} strokeDashoffset={inc.strokeDashoffset} />
          <path d={INCOME} fill="none" stroke={C.mint} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={inc.strokeDasharray} strokeDashoffset={inc.strokeDashoffset} />
          <path d={SAVINGS} fill="none" stroke={C.red} strokeWidth={10} strokeLinecap="round" opacity={blink}
            strokeDasharray={sav.strokeDasharray} strokeDashoffset={sav.strokeDashoffset} />
          <circle cx={740} cy={62} r={16 * endDot} fill={C.mint} />
          <circle cx={740} cy={62} r={34 * endDot} fill={C.mint} opacity={0.2} />
        </svg>
        <div style={{position: 'absolute', left: 470, top: 70, opacity: endDot, color: C.mint, fontWeight: 800, fontSize: 38}}>
          รายได้
        </div>
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 380,
            color: C.red,
            fontWeight: 800,
            fontSize: 38,
            opacity: ease(f, [savings, savings + 8], [0, 1]) * blink,
          }}
        >
          เงินเก็บ
        </div>
      </div>
    </AbsoluteFill>
  );
};
