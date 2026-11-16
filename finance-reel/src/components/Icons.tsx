import React from 'react';
import {C} from '../theme';

type P = {size?: number; color?: string; style?: React.CSSProperties};

export const ArrowUp: React.FC<P> = ({size = 100, color = C.mint, style}) => (
  <svg width={size * 0.8} height={size} viewBox="0 0 80 100" style={style}>
    <path d="M40 6 L74 46 L52 46 L52 94 L28 94 L28 46 L6 46 Z" fill={color} />
  </svg>
);

export const Coin: React.FC<P & {label?: string}> = ({size = 40, color = '#FCD34D', style}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={style}>
    <circle cx="20" cy="20" r="19" fill="#B45309" />
    <circle cx="20" cy="18.5" r="17" fill={color} />
    <circle cx="20" cy="18.5" r="12.5" fill="none" stroke="#D97706" strokeWidth="2" />
    <text x="20" y="25" textAnchor="middle" fontSize="17" fontWeight={800} fill="#92400E" fontFamily="'Noto Sans Thai'">
      ฿
    </text>
  </svg>
);

export const Wallet: React.FC<P & {open?: number}> = ({size = 300, style}) => (
  <svg width={size} height={size * 0.78} viewBox="0 0 300 234" style={style}>
    <rect x="18" y="30" width="250" height="40" rx="14" fill="#2C3E66" />
    <rect x="8" y="50" width="284" height="176" rx="30" fill="#3B5285" />
    <rect x="8" y="50" width="284" height="40" rx="20" fill="#4A64A0" />
    <rect x="196" y="112" width="104" height="66" rx="20" fill="#2C3E66" />
    <circle cx="232" cy="145" r="13" fill={C.mint} />
  </svg>
);

export const Coffee: React.FC<P> = ({size = 150, style}) => (
  <svg width={size} height={size} viewBox="0 0 150 150" style={style}>
    <circle cx="75" cy="75" r="72" fill="#3B2A25" />
    <path d="M42 52 h66 l-8 70 a10 10 0 0 1 -10 9 h-30 a10 10 0 0 1 -10 -9 z" fill="#F5E6D3" />
    <rect x="36" y="40" width="78" height="16" rx="6" fill="#FFFFFF" />
    <rect x="46" y="76" width="58" height="26" fill="#B7794B" />
    <path d="M64 20 q6 8 0 16 M84 20 q6 8 0 16" stroke="#F5E6D3" strokeWidth="5" fill="none" strokeLinecap="round" />
  </svg>
);

export const Card: React.FC<P> = ({size = 150, style}) => (
  <svg width={size} height={size} viewBox="0 0 150 150" style={style}>
    <circle cx="75" cy="75" r="72" fill="#3A2232" />
    <rect x="22" y="44" width="106" height="68" rx="12" fill="#F87171" />
    <rect x="22" y="58" width="106" height="13" fill="#7F1D1D" />
    <rect x="34" y="84" width="22" height="16" rx="4" fill="#FDE68A" />
    <rect x="70" y="90" width="44" height="7" rx="3" fill="#FEE2E2" />
  </svg>
);

export const Parcel: React.FC<P> = ({size = 150, style}) => (
  <svg width={size} height={size} viewBox="0 0 150 150" style={style}>
    <circle cx="75" cy="75" r="72" fill="#3A3022" />
    <path d="M75 28 L120 50 L120 102 L75 124 L30 102 L30 50 Z" fill="#D6A165" />
    <path d="M75 28 L120 50 L75 72 L30 50 Z" fill="#E9BC85" />
    <path d="M75 72 L75 124" stroke="#A8743E" strokeWidth="3" />
    <path d="M52 39 L97 61 L97 78" stroke="#F5E6D3" strokeWidth="8" fill="none" />
  </svg>
);

export const Check: React.FC<P> = ({size = 40, color = C.mint, style}) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={style}>
    <path d="M8 21 L17 30 L33 11" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CommentBubble: React.FC<P & {dots?: number}> = ({size = 220, color = C.mint, dots = 1, style}) => (
  <svg width={size} height={size} viewBox="0 0 220 220" style={style}>
    <path
      d="M110 22 C166 22 202 56 202 100 C202 144 166 178 110 178 C98 178 87 176 77 173 L36 196 L46 158 C27 143 18 123 18 100 C18 56 54 22 110 22 Z"
      fill={color}
    />
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={74 + i * 36} cy={100} r={12} fill={C.navy} opacity={i < dots ? 1 : 0.35} />
    ))}
  </svg>
);

export const Calendar: React.FC<P> = ({size = 44, color = C.mint, style}) => (
  <svg width={size} height={size} viewBox="0 0 44 44" style={style}>
    <rect x="4" y="8" width="36" height="32" rx="7" fill="none" stroke={color} strokeWidth="4" />
    <path d="M4 18 H40 M14 4 V12 M30 4 V12" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <circle cx="22" cy="29" r="4.5" fill={color} />
  </svg>
);

/** Circled step number (drawn, so it never depends on font coverage). */
export const StepNum: React.FC<{n: number; size?: number; color?: string; fg?: string; style?: React.CSSProperties}> = ({
  n,
  size = 56,
  color = C.mint,
  fg = C.navy,
  style,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: size,
      background: color,
      color: fg,
      fontWeight: 800,
      fontSize: size * 0.6,
      lineHeight: 1,
      paddingBottom: size * 0.04,
      flexShrink: 0,
      ...style,
    }}
  >
    {n}
  </span>
);
