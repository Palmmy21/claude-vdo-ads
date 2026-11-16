import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {At, CoinStream, Headline, Pill} from '../components/Common';
import {Card, Coffee, Parcel, Wallet} from '../components/Icons';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, EASE_IN_OUT, baht, ease, pop, shake, slam} from '../theme';
import {at, scene} from '../timeline';

const S = scene('relate');
export const RELATE_CUES = {
  notEnough: at('relate', 'ไม่พอ'),
  butMore: at('relate', 'แต่พอ'),
  earnMore: at('relate', 'ได้มากขึ้น'),
  spendMore: at('relate', 'ใช้มากขึ้น'),
  coffee: at('relate', 'กาแฟ'),
  install: at('relate', 'ผ่อน'),
  stuff: at('relate', 'นั่นนี่'),
  monthEnd: at('relate', 'สิ้นเดือน'),
  same: at('relate', 'เท่าเดิม'),
};

const WALLET: [number, number] = [CX, 900];
const ICONS = [
  {key: 'coffee', x: 200, y: 760, from: [-200, 600], el: Coffee},
  {key: 'install', x: 802, y: 760, from: [1250, 600], el: Card},
  {key: 'stuff', x: CX, y: 1150, from: [CX, 1700], el: Parcel},
] as const;

export const Relate: React.FC = () => {
  const f = useSceneFrame();
  const c = RELATE_CUES;
  const arrive = {coffee: c.coffee, install: c.install, stuff: c.stuff};

  // balance: 1,200 → (earn more) 25,000 → drained back to 1,200
  const up = ease(f, [c.earnMore, c.earnMore + 26], [0, 23800]);
  const drain1 = ease(f, [c.coffee + 8, c.install + 6], [0, 7800], EASE_IN_OUT);
  const drain2 = ease(f, [c.install + 8, c.stuff + 6], [0, 9500], EASE_IN_OUT);
  const drain3 = ease(f, [c.stuff + 8, c.same + 6], [0, 6500], EASE_IN_OUT);
  const balance = 1200 + up - drain1 - drain2 - drain3;
  const broke = f >= c.same;
  const sh = shake(f, c.same, 10);

  const phaseA = 1 - ease(f, [c.butMore - 4, c.butMore + 10], [0, 1]);
  const strike = ease(f, [c.butMore - 8, c.butMore + 4], [0, 1]);

  const walletBob = Math.sin(f / 8) * 6;
  const walletSquash = f > c.coffee ? 1 - 0.03 * Math.abs(Math.sin(f / 3)) : 1;

  return (
    <AbsoluteFill>
      {/* phase A: the old belief */}
      {phaseA > 0.01 && (
        <At x={CX} y={400} style={{opacity: phaseA, transform: `translate(-50%, -50%) translateY(${(1 - phaseA) * -60}px)`}}>
          <div style={{position: 'relative', ...slam(f, 0)}}>
            <Headline size={96} style={{color: C.slate}}>
              ปัญหา = หาเงินไม่พอ?
            </Headline>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '54%',
                height: 10,
                borderRadius: 6,
                width: `${strike * 100}%`,
                background: C.red,
              }}
            />
          </div>
        </At>
      )}

      {/* phase B: ได้มาก = ใช้มาก */}
      <At x={CX} y={380}>
        <div style={{display: 'flex', gap: 24, alignItems: 'center'}}>
          <div style={slam(f, c.earnMore - 2)}>
            <Headline size={112} style={{color: C.mint}}>
              ได้มาก
            </Headline>
          </div>
          <div style={slam(f, c.spendMore - 2)}>
            <Headline size={112}>
              = <span style={{color: C.red}}>ใช้มาก</span>
            </Headline>
          </div>
        </div>
      </At>

      {/* balance */}
      <At x={CX} y={590} style={{transform: `translate(-50%, -50%) translate(${sh.x}px, ${sh.y}px)`}}>
        <Pill
          size={54}
          bg={broke ? C.redDim : 'rgba(255,255,255,0.07)'}
          color={broke ? C.red : balance > 2000 ? C.mint : C.white}
          style={{fontWeight: 800, transform: `scale(${interpolate(pop(f, 4), [0, 1], [0.6, 1])})`, opacity: pop(f, 4)}}
        >
          <span style={{fontSize: 34, fontWeight: 600, color: C.muted}}>{f >= c.monthEnd ? 'สิ้นเดือนเหลือ' : 'คงเหลือ'}</span>
          {baht(balance)}
        </Pill>
      </At>

      {/* income coins falling into the wallet when earning more */}
      <CoinStream f={f} from={[CX, 470]} to={[WALLET[0], WALLET[1] - 40]} ctrl={[CX + 120, 600]} start={c.earnMore} end={c.spendMore} every={3} travel={14} size={44} />

      <At x={WALLET[0]} y={WALLET[1] + walletBob} style={{transform: `translate(-50%, -50%) scale(${walletSquash})`}}>
        <div style={{opacity: pop(f, 2), transform: `scale(${interpolate(pop(f, 2), [0, 1], [0.7, 1])})`}}>
          <Wallet size={300} />
        </div>
      </At>

      {/* spenders fly in and suck coins out */}
      {ICONS.map((ic, i) => {
        const t = arrive[ic.key];
        const p = pop(f, t - 4, {damping: 14, stiffness: 160});
        const x = interpolate(p, [0, 1], [ic.from[0], ic.x]);
        const y = interpolate(p, [0, 1], [ic.from[1], ic.y]);
        const El = ic.el;
        const wobble = Math.sin((f + i * 9) / 6) * 6;
        return (
          <React.Fragment key={ic.key}>
            <CoinStream
              f={f}
              from={[WALLET[0], WALLET[1] - 20]}
              to={[ic.x, ic.y]}
              ctrl={[(WALLET[0] + ic.x) / 2, Math.min(WALLET[1], ic.y) - 120]}
              start={t + 6}
              end={S.dur - 10}
              every={7}
              travel={18}
              size={36}
            />
            <At x={x} y={y + wobble} style={{opacity: interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'})}}>
              <div style={{transform: `rotate(${(1 - p) * (i === 1 ? 40 : -40)}deg) scale(${1 + 0.06 * Math.sin(f / 4 + i)})`}}>
                <El size={150} />
              </div>
            </At>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
