import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {At, Headline, Pill} from '../components/Common';
import {useSceneFrame} from '../components/SceneWrap';
import {C, CX, EASE_IN_OUT, ease, pop, shake, slam} from '../theme';
import {at} from '../timeline';

export const TURN_CUES = {
  write: at('turn', 'จดรายจ่าย'),
  shock: at('turn', 'ตกใจ'),
  unintended: at('turn', 'ไม่ได้ตั้งใจ'),
  problem: at('turn', 'ปัญหาไม่ใช่'),
  where: at('turn', 'ไม่รู้ว่า'),
};

const ROWS: {d: string; item: string; amt: number; oops?: boolean}[] = [
  {d: '1', item: 'ข้าวกลางวัน', amt: 60},
  {d: '1', item: 'กาแฟเย็น', amt: 85},
  {d: '2', item: 'ค่าส่งของออนไลน์', amt: 45, oops: true},
  {d: '2', item: 'ผ่อนมือถือ', amt: 1290},
  {d: '3', item: 'ชานมไข่มุก', amt: 75, oops: true},
  {d: '4', item: 'แท็กซี่ (ตื่นสาย)', amt: 180, oops: true},
  {d: '5', item: 'กาแฟ + ขนม', amt: 145},
  {d: '6', item: 'เสื้อลดราคา ตีหนึ่ง', amt: 590, oops: true},
  {d: '7', item: 'ค่าเน็ตมือถือ', amt: 399},
  {d: '8', item: 'สตรีมมิ่งที่ลืมยกเลิก', amt: 279, oops: true},
  {d: '9', item: 'ข้าวเย็น', amt: 120},
  {d: '10', item: 'ของกินเล่นเซเว่น', amt: 96, oops: true},
  {d: '11', item: 'ผ่อนหูฟัง', amt: 690},
  {d: '12', item: 'เลี้ยงเพื่อน', amt: 850},
  {d: '13', item: 'สั่งเดลิเวอรี', amt: 230, oops: true},
  {d: '14', item: 'เติมเกม', amt: 300, oops: true},
  {d: '15', item: 'ค่าไฟ', amt: 760},
  {d: '16', item: 'กาแฟเย็น', amt: 85},
  {d: '17', item: 'ของแต่งห้อง', amt: 420, oops: true},
  {d: '18', item: 'ค่าเดินทาง', amt: 64},
  {d: '19', item: 'ขนมหวาน', amt: 89, oops: true},
  {d: '20', item: 'ข้าวกลางวัน', amt: 70},
];
const ROW_H = 66;
const PAPER_W = 600;
const PAPER_H = 740;

const DONUT = [
  {label: 'ไม่ได้ตั้งใจจ่าย', v: 31, color: C.red},
  {label: 'ผ่อนสินค้า', v: 24, color: '#6B83B8'},
  {label: 'กิน / กาแฟ', v: 22, color: '#93A6CF'},
  {label: 'บิล / ค่าเดินทาง', v: 15, color: '#4B5F8E'},
  {label: 'อื่นๆ', v: 8, color: '#C7D2EA'},
];

const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
};

export const Turn: React.FC = () => {
  const f = useSceneFrame();
  const c = TURN_CUES;

  const unroll = ease(f, [0, 22], [0, 1]);
  const scroll = ease(f, [8, c.problem + 6], [0, ROWS.length * ROW_H - PAPER_H + 210], EASE_IN_OUT);
  const zoom = ease(f, [c.problem - 6, c.problem + 18], [0, 1], EASE_IN_OUT);
  const sh = shake(f, c.shock, 12);
  const total = ROWS.reduce((a, r) => a + r.amt, 0) * 2.3;

  const tag = 1 - ease(f, [c.problem - 8, c.problem], [0, 1]);

  // donut
  let acc = -Math.PI / 2;
  const R = 200;
  const DCX = CX;
  const DCY = 815;

  return (
    <AbsoluteFill>
      {tag > 0.01 && (
        <At x={CX} y={330} style={{opacity: tag * pop(f, 0)}}>
          <Pill size={44} bg={C.mintDim} color={C.mint} style={{fontWeight: 800}}>
            ทดลองจดรายจ่ายจริงจัง 30 วัน
          </Pill>
        </At>
      )}
      <At x={CX} y={345}>
        <div style={slam(f, c.problem - 2)}>
          <Headline size={100}>
            ปัญหา<span style={{color: C.red}}>ไม่ใช่</span>รายได้
          </Headline>
        </div>
      </At>

      {/* the receipt (zooms out of frame focus) */}
      <div
        style={{
          position: 'absolute',
          left: CX - PAPER_W / 2,
          top: 430,
          width: PAPER_W,
          height: PAPER_H,
          transformOrigin: '50% 0%',
          transform: `translate(${sh.x + zoom * -250}px, ${sh.y + zoom * 120}px) scale(${interpolate(zoom, [0, 1], [1, 0.36])}) rotate(${zoom * -8}deg)`,
          opacity: interpolate(zoom, [0, 1], [1, 0.22]),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            height: PAPER_H * unroll,
            overflow: 'hidden',
            borderRadius: 26,
            background: '#F8FAFC',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{position: 'relative', zIndex: 2, background: '#F8FAFC', padding: '22px 36px 8px', color: C.navy, fontWeight: 800, fontSize: 40, borderBottom: '3px dashed #CBD5E1'}}>
            รายจ่ายเดือนนี้
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 90, bottom: 0, overflow: 'hidden'}}>
          <div style={{transform: `translateY(${-scroll}px)`}}>
            {ROWS.map((r, i) => {
              const hl = r.oops ? ease(f, [c.unintended + i * 0.6, c.unintended + 8 + i * 0.6], [0, 1]) : 0;
              return (
                <div
                  key={i}
                  style={{
                    height: ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 36px',
                    gap: 18,
                    fontSize: 32,
                    color: '#1E293B',
                    background: `rgba(248,113,113,${0.22 * hl})`,
                    borderBottom: '2px solid #E2E8F0',
                  }}
                >
                  <span style={{width: 44, color: '#64748B', fontSize: 26}}>{r.d}</span>
                  <span style={{flex: 1, whiteSpace: 'nowrap'}}>{r.item}</span>
                  {hl > 0.05 && (
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: '#fff',
                        background: '#EF4444',
                        borderRadius: 10,
                        padding: '0 10px 2px',
                        transform: `scale(${hl})`,
                      }}
                    >
                      ไม่ได้ตั้งใจ
                    </span>
                  )}
                  <span style={{color: '#DC2626', fontWeight: 800, width: 110, textAlign: 'right'}}>-{r.amt}</span>
                </div>
              );
            })}
          </div>
          </div>
        </div>
        {/* shock stamp */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 26,
            transform: `translateX(-50%) rotate(-4deg) ${slam(f, c.shock - 1).transform}`,
            opacity: slam(f, c.shock - 1).opacity,
            background: C.red,
            color: '#fff',
            borderRadius: 22,
            padding: '6px 34px 12px',
            fontSize: 54,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            boxShadow: '0 16px 40px rgba(248,113,113,0.45)',
          }}
        >
          รวม ฿{Math.round(total).toLocaleString('en-US')} !
        </div>
      </div>

      {/* donut chart */}
      {zoom > 0.01 && (
        <div style={{position: 'absolute', inset: 0, opacity: zoom, transform: `scale(${interpolate(zoom, [0, 1], [1.5, 1])})`, transformOrigin: `${DCX}px ${DCY}px`}}>
          <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            {DONUT.map((d, i) => {
              const span = (d.v / 100) * Math.PI * 2;
              const a0 = acc;
              acc += span;
              const grow = ease(f, [c.problem + 6 + i * 5, c.problem + 22 + i * 5], [0, 1], EASE_IN_OUT);
              const a1 = a0 + span * grow - 0.03;
              const isOops = i === 0;
              const out = isOops ? 18 * ease(f, [c.where - 4, c.where + 6], [0, 1]) : 0;
              const mid = a0 + span / 2;
              if (grow <= 0.01) return null;
              return (
                <path
                  key={d.label}
                  d={arc(DCX + Math.cos(mid) * out, DCY + Math.sin(mid) * out, R, a0, a1)}
                  stroke={d.color}
                  strokeWidth={isOops ? 104 : 90}
                  fill="none"
                />
              );
            })}
          </svg>
          <At x={DCX} y={DCY}>
            <div style={{textAlign: 'center', lineHeight: 1.35}}>
              <div style={{fontSize: 40, fontWeight: 600, color: C.slate, opacity: ease(f, [c.problem + 20, c.problem + 30], [0, 1])}}>ไม่รู้ว่า</div>
              <div style={{fontSize: 56, fontWeight: 800, color: C.white, ...slam(f, c.where)}}>เงินไปไหน?</div>
            </div>
          </At>
          {/* legend */}
          <div
            style={{
              position: 'absolute',
              left: 110,
              width: 800,
              top: 1070,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 30px',
              justifyContent: 'center',
            }}
          >
            {DONUT.map((d, i) => (
              <div
                key={d.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: i === 0 ? 36 : 30,
                  fontWeight: i === 0 ? 800 : 600,
                  color: i === 0 ? C.red : C.slate,
                  opacity: ease(f, [c.problem + 12 + i * 5, c.problem + 20 + i * 5], [0, 1]),
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{width: 22, height: 22, borderRadius: 6, background: d.color}} />
                {d.label} {d.v}%
              </div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
