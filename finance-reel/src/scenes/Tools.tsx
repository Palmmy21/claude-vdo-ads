import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {At, CoinStream, Pill} from '../components/Common';
import {Calendar, Check, StepNum, Wallet} from '../components/Icons';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, EASE_IN_OUT, SAFE, ease, pop, slam} from '../theme';
import {at, scene} from '../timeline';

const S = scene('tools');
const B = S.beats;
export const TOOLS_CUES = {
  three: at('tools', '3 อย่าง'),
  one: at('tools', 'หนึ่ง'),
  write: at('tools', 'จดรายจ่าย'),
  helper: at('tools', 'ตัวช่วย'),
  line: at('tools', 'LINE'),
  cat: at('tools', 'เหมียว'),
  chat: at('tools', 'แชท'),
  noApp: at('tools', 'ไม่ต้องลง'),
  two: at('tools', 'สอง'),
  spendAcc: at('tools', 'บัญชีใช้จ่าย'),
  saveAcc: at('tools', 'บัญชีเก็บ'),
  emergAcc: at('tools', 'บัญชีฉุกเฉิน'),
  auto: at('tools', 'อัตโนมัติ'),
  payday: at('tools', 'เงินเข้า'),
  three2: at('tools', 'สาม'),
  invest: at('tools', 'ลงทุน'),
  monthly: at('tools', 'เท่ากันทุกเดือน'),
  small: at('tools', 'เงินน้อยๆ'),
  time: at('tools', 'เวลา'),
};
const c = TOOLS_CUES;

const STEPS = [
  {n: 1, label: 'จด', cue: c.one},
  {n: 2, label: 'แยกบัญชี', cue: c.two},
  {n: 3, label: 'ลงทุน', cue: c.three2},
];

const beatIndex = (f: number) => (f >= B[2].start - 4 ? 2 : f >= B[1].start - 4 ? 1 : 0);

/** Fade a beat's stage in/out with a quick vertical slide. */
const stage = (f: number, i: number) => {
  const inF = i === 0 ? c.write - 6 : B[i].start - 4;
  const outF = i === 2 ? S.dur + 99 : B[i + 1].start - 6;
  const pin = pop(f, inF, {damping: 15, stiffness: 170});
  const pout = ease(f, [outF - 6, outF + 4], [0, 1], EASE_IN_OUT);
  return {
    visible: pin > 0.001 && pout < 0.999,
    style: {
      opacity: Math.min(interpolate(pin, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'}), 1 - pout),
      transform: `translateY(${interpolate(pin, [0, 1], [120, 0]) - pout * 140}px) scale(${1 - pout * 0.08})`,
    } as React.CSSProperties,
  };
};

const Header: React.FC<{f: number}> = ({f}) => {
  const active = f < c.one ? -1 : beatIndex(f);
  return (
    <At x={CX} y={318}>
      <div style={{display: 'flex', gap: 18}}>
        {STEPS.map((s, i) => {
          const appear = pop(f, c.three - 2 + i * 4);
          const isActive = i === active;
          const numBump = pop(f, s.cue, {damping: 8, stiffness: 240});
          const numScale = f >= s.cue && f < s.cue + 24 ? interpolate(numBump, [0, 1], [1.5, 1]) : 1;
          return (
            <div
              key={s.n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 26px 14px 12px',
                borderRadius: 999,
                background: isActive ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)',
                border: `3px solid ${isActive ? C.mint : 'rgba(255,255,255,0.1)'}`,
                transform: `scale(${interpolate(appear, [0, 1], [0.4, 1]) * (isActive ? 1.06 : 0.96)})`,
                opacity: interpolate(appear, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}) * (active === -1 || isActive ? 1 : 0.55),
                whiteSpace: 'nowrap',
              }}
            >
              <StepNum
                n={s.n}
                size={58}
                color={isActive || active === -1 ? C.mint : C.muted}
                style={{transform: `scale(${numScale})`, boxShadow: isActive ? '0 0 30px rgba(52,211,153,0.7)' : undefined}}
              />
              <span style={{fontSize: 46, fontWeight: 800, color: isActive ? C.white : C.slate, lineHeight: 1.4}}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </At>
  );
};

/* ───────────── ① chat mockup ───────────── */
const typed = (text: string, f: number, start: number, perChar = 2.2) => {
  const chars = Array.from(new Intl.Segmenter('th', {granularity: 'grapheme'}).segment(text)).map((s) => s.segment);
  const n = Math.max(0, Math.min(chars.length, Math.floor((f - start) / perChar)));
  return chars.slice(0, n).join('');
};

const Bubble: React.FC<{me?: boolean; f: number; at: number; children: React.ReactNode}> = ({me, f, at: t, children}) => {
  const p = pop(f, t, {damping: 14, stiffness: 220});
  if (f < t) return null;
  return (
    <div
      style={{
        alignSelf: me ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        background: me ? C.mint : '#2A3757',
        color: me ? C.navy : C.white,
        borderRadius: 30,
        borderBottomRightRadius: me ? 8 : 30,
        borderBottomLeftRadius: me ? 30 : 8,
        padding: '10px 26px 14px',
        fontSize: 36,
        fontWeight: me ? 800 : 600,
        lineHeight: 1.45,
        transformOrigin: me ? '100% 100%' : '0% 100%',
        transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`,
        opacity: interpolate(p, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'}),
      }}
    >
      {children}
    </div>
  );
};

const TypingDots: React.FC<{f: number; from: number; to: number}> = ({f, from, to}) =>
  f >= from && f < to ? (
    <div style={{alignSelf: 'flex-start', background: '#2A3757', borderRadius: 30, padding: '20px 26px', display: 'flex', gap: 10}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 14, height: 14, borderRadius: 7, background: C.slate, transform: `translateY(${Math.sin((f - from) / 2.5 - i) * 5}px)`}} />
      ))}
    </div>
  ) : null;

const Chat: React.FC<{f: number}> = ({f}) => {
  const t1 = c.helper; // start typing "กาแฟ 85"
  const send1 = t1 + 18;
  const reply1 = c.cat + 2;
  const t2 = c.chat - 6;
  const send2 = t2 + 22;
  const reply2 = c.noApp + 4;
  const input = f < send1 ? typed('กาแฟ 85', f, t1) : f >= t2 && f < send2 ? typed('ข้าวมันไก่ 50', f, t2, 1.6) : '';
  const caret = Math.floor(f / 8) % 2 === 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: CX - 310,
        top: 430,
        width: 620,
        height: 790,
        borderRadius: 48,
        background: '#111A2E',
        border: `3px solid ${C.line}`,
        boxShadow: '0 40px 90px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{height: 108, display: 'flex', alignItems: 'center', gap: 20, padding: '0 30px', background: '#18233D'}}>
        {/* generic cat-ish bot avatar */}
        <svg width={64} height={64} viewBox="0 0 64 64">
          <path d="M10 22 L16 4 L28 16 Z M54 22 L48 4 L36 16 Z" fill={C.mint} />
          <circle cx="32" cy="36" r="24" fill={C.mint} />
          <circle cx="24" cy="34" r="3.5" fill={C.navy} />
          <circle cx="40" cy="34" r="3.5" fill={C.navy} />
          <path d="M28 43 Q32 47 36 43" stroke={C.navy} strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <div style={{lineHeight: 1.3}}>
          <div style={{fontSize: 34, fontWeight: 800, color: C.white}}>ผู้ช่วยจดรายจ่าย</div>
          <div style={{fontSize: 24, color: C.mint}}>● บอทในแชท</div>
        </div>
      </div>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16, padding: '20px 26px'}}>
        <Bubble f={f} at={send1} me>
          กาแฟ 85
        </Bubble>
        <TypingDots f={f} from={send1 + 6} to={reply1} />
        <Bubble f={f} at={reply1}>
          <span style={{color: C.mint, fontWeight: 800}}>บันทึกแล้ว ✓</span>
          <br />
          กาแฟ <b style={{color: C.red}}>−85</b> บาท
          <br />
          <span style={{fontSize: 28, color: C.slate}}>วันนี้ใช้ไป 85 / 500</span>
        </Bubble>
        <Bubble f={f} at={send2} me>
          ข้าวมันไก่ 50
        </Bubble>
        <TypingDots f={f} from={send2 + 4} to={reply2} />
        <Bubble f={f} at={reply2}>
          <span style={{color: C.mint, fontWeight: 800}}>บันทึกแล้ว ✓</span> รวม 135 บาท
        </Bubble>
      </div>
      <div style={{height: 96, display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px', background: '#18233D'}}>
        <div style={{flex: 1, height: 64, borderRadius: 32, background: '#0E1628', display: 'flex', alignItems: 'center', padding: '0 26px', fontSize: 32, color: input ? C.white : C.muted, whiteSpace: 'nowrap'}}>
          {input || 'พิมพ์ข้อความ…'}
          {input && caret ? <span style={{width: 3, height: 38, background: C.mint, marginLeft: 4}} /> : null}
        </div>
        <div style={{width: 64, height: 64, borderRadius: 32, background: input ? C.mint : '#2A3757', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={30} height={30} viewBox="0 0 30 30">
            <path d="M3 15 L27 4 L20 27 L15 17 Z" fill={C.navy} />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ───────────── ② split accounts ───────────── */
const BOXES = [
  {label: 'ใช้จ่าย', pct: 50, color: C.red, cue: c.spendAcc, x: 222},
  {label: 'เก็บ', pct: 30, color: C.mint, cue: c.saveAcc, x: CX},
  {label: 'ฉุกเฉิน', pct: 20, color: C.slate, cue: c.emergAcc, x: 780},
];
const WALLET_P: [number, number] = [CX, 560];

const Split: React.FC<{f: number}> = ({f}) => {
  const payBurst = pop(f, c.payday - 2);
  return (
    <>
      {/* payday coins into wallet */}
      <CoinStream f={f} from={[CX + 300, 380]} to={[WALLET_P[0] + 30, WALLET_P[1] - 30]} start={c.payday - 4} end={c.payday + 30} every={3} travel={14} size={40} />
      <At x={WALLET_P[0]} y={WALLET_P[1] + Math.sin(f / 7) * 5}>
        <div style={{transform: `scale(${1 + 0.08 * Math.max(0, Math.sin(Math.min(1, (f - c.payday) / 8) * Math.PI)) * (f > c.payday ? 1 : 0)})`}}>
          <Wallet size={250} />
        </div>
      </At>
      {f >= c.payday - 2 && (
        <At x={CX + 210} y={470} style={{opacity: interpolate(payBurst, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'})}}>
          <Pill size={34} bg={C.mintDim} color={C.mint} style={{fontWeight: 800, transform: `scale(${payBurst})`}}>
            + เงินเดือนเข้า
          </Pill>
        </At>
      )}
      {BOXES.map((b, i) => {
        const p = pop(f, b.cue - 3, {damping: 12, stiffness: 180});
        const fill = ease(f, [b.cue + 6, b.cue + 60], [0.08, b.pct / 55], EASE_IN_OUT) + (f > c.payday ? ease(f, [c.payday + 10, c.payday + 40], [0, 0.1]) : 0);
        return (
          <React.Fragment key={b.label}>
            <CoinStream
              f={f}
              from={[WALLET_P[0], WALLET_P[1] + 40]}
              to={[b.x, 900]}
              ctrl={[(WALLET_P[0] + b.x) / 2, 760]}
              start={b.cue + 2}
              end={S.dur}
              every={i === 1 ? 5 : 7}
              travel={16}
              size={34}
            />
            <div
              style={{
                position: 'absolute',
                left: b.x - 120,
                top: 880,
                width: 240,
                height: 250,
                transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px) scale(${interpolate(p, [0, 1], [0.6, 1])})`,
                opacity: interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
              }}
            >
              <div style={{position: 'absolute', inset: 0, borderRadius: 34, background: 'rgba(255,255,255,0.06)', border: `4px solid ${b.color}`, overflow: 'hidden'}}>
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(1, fill) * 100}%`, background: b.color, opacity: 0.35}} />
              </div>
              <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.35}}>
                <div style={{fontSize: 44, fontWeight: 800, color: C.white}}>{b.label}</div>
                <div style={{fontSize: 34, fontWeight: 600, color: b.color}}>{b.pct}%</div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <At x={CX} y={1190}>
        <div style={{...slam(f, c.auto - 2)}}>
          <Pill size={40} bg="rgba(52,211,153,0.14)" color={C.white} style={{fontWeight: 800}}>
            <Calendar size={42} />
            โอนอัตโนมัติ ทุกวันที่เงินเข้า
          </Pill>
        </div>
      </At>
    </>
  );
};

/* ───────────── ③ compound growth ───────────── */
const GW = 820;
const GH = 640;
const years = 25;
const fv = (y: number) => ((Math.pow(1 + 0.07 / 12, y * 12) - 1) / (0.07 / 12)) * 1; // monthly 1 unit
const MAXV = fv(years);
const gx = (y: number) => 80 + (y / years) * (GW - 130);
const gy = (v: number) => GH - 90 - (v / MAXV) * (GH - 170);
const COMPOUND = new Array(51).fill(0).map((_, i) => {
  const y = (i / 50) * years;
  return `${i === 0 ? 'M' : 'L'} ${gx(y).toFixed(1)} ${gy(fv(y)).toFixed(1)}`;
}).join(' ');
const PRINCIPAL = `M ${gx(0)} ${gy(0)} L ${gx(years)} ${gy(12 * years)}`;

const Growth: React.FC<{f: number}> = ({f}) => {
  const s3 = B[2].start;
  const draw = ease(f, [s3 + 8, c.time + 4], [0, 1], EASE_IN_OUT);
  const prin = ease(f, [c.monthly - 4, c.monthly + 30], [0, 1], EASE_IN_OUT);
  const cp = evolvePath(draw, COMPOUND);
  const pp = evolvePath(prin, PRINCIPAL);
  const timeGlow = ease(f, [c.time - 2, c.time + 12], [0, 1]);
  const area = `${COMPOUND} L ${gx(years)} ${gy(0)} L ${gx(0)} ${gy(0)} Z`;
  // end-point of the drawn curve
  const yNow = draw * years;
  return (
    <div style={{position: 'absolute', left: CX - GW / 2, top: 430, width: GW, height: GH, borderRadius: 40, background: 'rgba(22,33,58,0.85)', border: `2px solid ${C.line}`}}>
      <svg width={GW} height={GH}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.mint} stopOpacity={0.45} />
            <stop offset="1" stopColor={C.mint} stopOpacity={0} />
          </linearGradient>
          <clipPath id="clipDraw">
            <rect x={0} y={0} width={gx(yNow) + 2} height={GH} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={80} x2={GW - 50} y1={gy(0) - i * 130} y2={gy(0) - i * 130} stroke={C.line} strokeWidth={2} strokeDasharray="6 10" />
        ))}
        {/* equal monthly contributions */}
        {new Array(25).fill(0).map((_, i) => {
          const bp = pop(f, c.monthly - 4 + i * 1.2);
          return <rect key={i} x={gx(i + 0.5) - 8} y={gy(0) - 30 * bp} width={16} height={30 * bp} rx={4} fill={C.slate} opacity={0.55} />;
        })}
        <path d={area} fill="url(#g)" clipPath="url(#clipDraw)" opacity={0.5 + 0.5 * timeGlow} />
        <path d={PRINCIPAL} stroke={C.slate} strokeWidth={6} strokeDasharray={pp.strokeDasharray} strokeDashoffset={pp.strokeDashoffset} fill="none" strokeLinecap="round" />
        <path d={COMPOUND} stroke={C.mint} strokeWidth={10} strokeDasharray={cp.strokeDasharray} strokeDashoffset={cp.strokeDashoffset} fill="none" strokeLinecap="round" />
        <circle cx={gx(yNow)} cy={gy(fv(yNow))} r={draw > 0.01 ? 14 : 0} fill={C.mint} />
        <circle cx={gx(yNow)} cy={gy(fv(yNow))} r={draw > 0.01 ? 30 + 6 * Math.sin(f / 4) : 0} fill={C.mint} opacity={0.18} />
        {[0, 5, 10, 15, 20, 25].map((y) => (
          <text key={y} x={gx(y)} y={GH - 40} fill={C.muted} fontSize={26} textAnchor="middle" fontFamily="'Noto Sans Thai'">
            {y === 0 ? 'เริ่ม' : `${y} ปี`}
          </text>
        ))}
      </svg>
      <div style={{position: 'absolute', left: 110, top: 40, lineHeight: 1.4}}>
        <div style={{fontSize: 34, fontWeight: 800, color: C.mint, opacity: ease(f, [s3 + 10, s3 + 20], [0, 1])}}>เงินต้น + ผลตอบแทนทบต้น</div>
        <div style={{fontSize: 30, fontWeight: 600, color: C.slate, opacity: prin}}>— เงินต้น (ลงเท่ากันทุกเดือน)</div>
      </div>
      <div style={{position: 'absolute', right: 40, top: 230, ...slam(f, c.time - 1)}}>
        <Pill size={44} bg={C.mint} color={C.navy} style={{fontWeight: 800, boxShadow: '0 0 40px rgba(52,211,153,0.6)'}}>
          ตัวช่วยคือ “เวลา”
        </Pill>
      </div>
      <div style={{position: 'absolute', left: 110, top: 150, ...slam(f, c.small - 1)}}>
        <Pill size={32} bg="rgba(255,255,255,0.08)" color={C.white}>
          เริ่มน้อยๆ ก็ได้
        </Pill>
      </div>
    </div>
  );
};

export const Tools: React.FC = () => {
  const f = useSceneFrame();
  const st = [stage(f, 0), stage(f, 1), stage(f, 2)];
  const disclaimer = ease(f, [B[2].start, B[2].start + 10], [0, 1]);
  const bigThree = f < c.one + 4 ? pop(f, c.three - 3) : 0;
  return (
    <AbsoluteFill>
      <Header f={f} />
      {/* "3 อย่าง" intro number */}
      {bigThree > 0 && f < c.write && (
        <At x={CX} y={820} style={{opacity: 1 - ease(f, [c.write - 10, c.write - 2], [0, 1])}}>
          <div style={{fontSize: 360, fontWeight: 800, color: C.mint, lineHeight: 1.2, transform: `scale(${bigThree})`, textShadow: '0 0 80px rgba(52,211,153,0.5)'}}>3</div>
          <div style={{fontSize: 64, fontWeight: 800, color: C.white, marginLeft: 20, transform: `scale(${bigThree})`}}>อย่าง</div>
        </At>
      )}
      {st[0].visible && (
        <AbsoluteFill style={st[0].style}>
          <Chat f={f} />
          <At x={CX + 200} y={1188} style={{...slam(f, c.noApp)}}>
            <Pill size={36} bg={C.mint} color={C.navy} style={{fontWeight: 800}}>
              <Check size={34} color={C.navy} /> ไม่ต้องลงแอปเพิ่ม
            </Pill>
          </At>
        </AbsoluteFill>
      )}
      {st[1].visible && (
        <AbsoluteFill style={st[1].style}>
          <Split f={f} />
        </AbsoluteFill>
      )}
      {st[2].visible && (
        <AbsoluteFill style={st[2].style}>
          <Growth f={f} />
        </AbsoluteFill>
      )}
      {disclaimer > 0 && (
        <div
          style={{
            position: 'absolute',
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            top: 1468,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 400,
            color: 'rgba(203,213,225,0.85)',
            opacity: disclaimer,
            lineHeight: 1.4,
          }}
        >
          การลงทุนมีความเสี่ยง ศึกษาข้อมูลก่อนตัดสินใจ
        </div>
      )}
    </AbsoluteFill>
  );
};
