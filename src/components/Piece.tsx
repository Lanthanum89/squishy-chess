import type { Color, PieceSymbol } from 'chess.js'

type Palette = { fill: string; edge: string; cheek: string; shine: string }

const PALETTES: Record<Color, Palette> = {
  w: { fill: '#ffb8d6', edge: '#e0709f', cheek: '#ff7aa8', shine: '#fff0f6' },
  b: { fill: '#b7c4ff', edge: '#6f7fd6', cheek: '#ff9ec7', shine: '#eef1ff' },
}

const GOLD = '#ffd86b'
const GOLD_EDGE = '#d9a62b'
const INK = '#5b3a4a'

function Face({ y }: { y: number }) {
  return (
    <g>
      <circle cx="40" cy={y} r="3.6" fill={INK} />
      <circle cx="60" cy={y} r="3.6" fill={INK} />
      <circle cx="41.2" cy={y - 1.2} r="1.1" fill="#fff" />
      <circle cx="61.2" cy={y - 1.2} r="1.1" fill="#fff" />
      <ellipse cx="32" cy={y + 6} rx="5" ry="3.2" fill="var(--cheek)" opacity="0.55" />
      <ellipse cx="68" cy={y + 6} rx="5" ry="3.2" fill="var(--cheek)" opacity="0.55" />
      <path
        d={`M45 ${y + 5} Q50 ${y + 11} 55 ${y + 5}`}
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  )
}

function Body({ type }: { type: PieceSymbol }) {
  switch (type) {
    case 'p':
      return (
        <>
          <path d="M50 30 Q42 22 48 17 Q56 20 52 30" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="50" cy="62" rx="26" ry="24" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
        </>
      )
    case 'r':
      return (
        <>
          <rect x="24" y="34" width="52" height="54" rx="20" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          {[26, 43, 60].map((x) => (
            <rect key={x} x={x} y="22" width="14" height="18" rx="6" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          ))}
        </>
      )
    case 'n':
      return (
        <>
          <path d="M30 40 L28 22 L42 32 Z" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M70 40 L72 22 L58 32 Z" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="50" cy="62" rx="28" ry="26" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          <path d="M50 8 L43 34 L57 34 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="76" cy="52" r="6" fill="var(--edge)" opacity="0.55" />
          <circle cx="79" cy="66" r="5" fill="var(--edge)" opacity="0.55" />
        </>
      )
    case 'b':
      return (
        <>
          <ellipse cx="50" cy="60" rx="24" ry="30" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          <path d="M32 40 Q50 -2 68 40 Q50 46 32 40 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M50 10 l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6z" fill="#fff" opacity="0.9" />
        </>
      )
    case 'q':
      return (
        <>
          <ellipse cx="50" cy="62" rx="30" ry="27" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          <path d="M28 40 L30 16 L41 28 L50 10 L59 28 L70 16 L72 40 Q50 46 28 40 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="30" cy="15" r="3.5" fill="#ff7aa8" />
          <circle cx="50" cy="9" r="3.5" fill="#ff7aa8" />
          <circle cx="70" cy="15" r="3.5" fill="#ff7aa8" />
        </>
      )
    case 'k':
      return (
        <>
          <ellipse cx="50" cy="63" rx="33" ry="28" fill="var(--fill)" stroke="var(--edge)" strokeWidth="3" />
          <path d="M30 42 L32 24 L42 32 L50 22 L58 32 L68 24 L70 42 Q50 48 30 42 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="47" y="6" width="6" height="17" rx="2.5" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2" />
          <rect x="42" y="11" width="16" height="6" rx="2.5" fill={GOLD} stroke={GOLD_EDGE} strokeWidth="2" />
        </>
      )
  }
}

const FACE_Y: Record<PieceSymbol, number> = { p: 62, r: 62, n: 62, b: 64, q: 62, k: 64 }

export default function Piece({
  type,
  color,
  className = '',
}: {
  type: PieceSymbol
  color: Color
  className?: string
}) {
  const p = PALETTES[color]
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ '--fill': p.fill, '--edge': p.edge, '--cheek': p.cheek } as React.CSSProperties}
      aria-hidden="true"
    >
      <ellipse cx="50" cy="91" rx="28" ry="5" fill={INK} opacity="0.12" />
      <Body type={type} />
      <ellipse cx="36" cy="48" rx="9" ry="5" fill={p.shine} opacity="0.7" transform="rotate(-25 36 48)" />
      <Face y={FACE_Y[type]} />
    </svg>
  )
}
