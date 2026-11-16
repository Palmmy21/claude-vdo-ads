import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {At, Headline, Pill} from '../components/Common';
import {Check, CommentBubble} from '../components/Icons';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, ease, pop, slam} from '../theme';
import {at} from '../timeline';

export const CTA_CUES = {
  noWait: at('cta', 'ไม่ต้องรอ'),
  today: at('cta', 'วันนี้'),
  one: at('cta', 'รายการเดียว'),
  comment: at('cta', 'คอมเมนต์'),
  helper: at('cta', 'ตัวช่วย'),
};
const c = CTA_CUES;

export const Cta: React.FC = () => {
  const f = useSceneFrame();
  const intro = pop(f, c.noWait);
  const introOut = ease(f, [c.today - 6, c.today + 4], [0, 1]);
  const card = pop(f, c.today + 6);
  const tick = pop(f, c.one + 4, {damping: 10, stiffness: 220});
  const bubble = pop(f, c.comment - 2, {damping: 8, stiffness: 170});
  const bounce = f > c.comment + 10 ? Math.abs(Math.sin((f - c.comment) / 7)) * -26 : 0;
  const dots = f > c.comment ? 1 + (Math.floor((f - c.comment) / 7) % 3) : 1;
  const point = Math.abs(Math.sin(f / 6)) * 18;
  const plusOne = ease(f, [c.one + 8, c.one + 30], [0, 1]);

  return (
    <AbsoluteFill>
      {introOut < 1 && (
        <At x={CX} y={560} style={{opacity: (1 - introOut) * intro, transform: `translate(-50%, -50%) translateY(${interpolate(intro, [0, 1], [40, 0]) - introOut * 80}px)`}}>
          <Headline size={78} style={{color: C.slate}}>
            ไม่ต้องรอให้<span style={{color: C.white}}>รายได้เพิ่ม</span>
          </Headline>
        </At>
      )}

      <At x={CX} y={390}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, ...slam(f, c.today - 2)}}>
          <Headline size={128}>เริ่มวันนี้</Headline>
          <span style={{fontSize: 112, lineHeight: 1.3, display: 'inline-block', transform: `translateY(${point}px)`}}>👇</span>
        </div>
      </At>

      {/* one-item checklist */}
      <div
        style={{
          position: 'absolute',
          left: CX - 360,
          top: 590,
          width: 720,
          height: 170,
          borderRadius: 36,
          background: 'rgba(15,23,42,0.6)',
          border: `3px solid ${tick > 0.5 && f >= c.one ? C.mint : 'rgba(255,255,255,0.14)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 30,
          padding: '0 40px',
          transform: `scale(${interpolate(card, [0, 1], [0.7, 1])})`,
          opacity: interpolate(card, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{width: 84, height: 84, borderRadius: 22, border: `5px solid ${f >= c.one ? C.mint : C.slate}`, background: f >= c.one + 4 ? C.mint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {f >= c.one + 4 && <Check size={60} color={C.navy} style={{transform: `scale(${tick})`}} />}
        </div>
        <div style={{lineHeight: 1.35}}>
          <div style={{fontSize: 48, fontWeight: 800, color: C.white}}>จดรายจ่าย 1 รายการ</div>
          <div style={{fontSize: 30, color: C.slate}}>แค่นี้ก่อน พอ</div>
        </div>
        <div style={{position: 'absolute', right: 40, top: 30 - plusOne * 40, opacity: plusOne > 0 && plusOne < 1 ? 1 - plusOne * 0.6 : plusOne >= 1 ? 0.4 : 0, fontSize: 44, fontWeight: 800, color: C.mint}}>+1</div>
      </div>

      {/* comment prompt */}
      <At x={CX} y={1010} style={{flexDirection: 'column', gap: 14}}>
        <div style={{transform: `translateY(${bounce}px) scale(${interpolate(bubble, [0, 1], [0.2, 1])}) rotate(${interpolate(bubble, [0, 1], [-20, 0])}deg)`, opacity: interpolate(bubble, [0, 0.2], [0, 1], {extrapolateRight: 'clamp'})}}>
          <CommentBubble size={230} dots={dots} />
        </div>
        <div style={{...slam(f, c.helper - 2)}}>
          <Pill size={42} bg="rgba(15,23,42,0.6)" color={C.white} style={{fontWeight: 800}}>
            คุณใช้ตัวช่วยอะไรอยู่?
          </Pill>
        </div>
      </At>
    </AbsoluteFill>
  );
};
