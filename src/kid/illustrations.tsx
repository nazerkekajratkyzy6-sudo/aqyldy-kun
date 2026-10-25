import type { ReactNode } from 'react';
import type { WithFree } from '../core/kid';

/** Бірыңғай стильдегі SVG-иллюстрациялар (жалпақ, 2–3 реңк, жұмсақ контур). */
const P = {
  ink: '#17263C',
  blue: '#2563EB',
  sky: '#BFDBFE',
  sky2: '#DBEAFE',
  teal: '#0D9488',
  mint: '#99F6E4',
  green: '#65A30D',
  lime: '#D9F99D',
  amber: '#F59E0B',
  butter: '#FDE68A',
  coral: '#F97362',
  peach: '#FED7AA',
  violet: '#7C3AED',
  lav: '#DDD6FE',
  white: '#FFFFFF',
  line: '#CBD5E1',
};

function Svg({ size = 72, children, label }: { size?: number; children: ReactNode; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function Sleep({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M66 14a14 14 0 1 0 14 18 11 11 0 0 1-14-18Z" fill={P.butter} stroke={P.amber} strokeWidth="2.5" />
      <circle cx="44" cy="18" r="2" fill={P.amber} />
      <circle cx="52" cy="30" r="1.5" fill={P.amber} />
      <rect x="10" y="40" width="10" height="38" rx="4" fill={P.violet} />
      <rect x="18" y="56" width="70" height="16" rx="6" fill={P.lav} stroke={P.violet} strokeWidth="2.5" />
      <path d="M40 56c6-8 18-8 24 0s18 8 24 0v16H40Z" fill={P.violet} opacity=".85" />
      <rect x="22" y="47" width="20" height="11" rx="5.5" fill={P.white} stroke={P.violet} strokeWidth="2.5" />
      <path d="M18 72v8M84 72v8" stroke={P.violet} strokeWidth="4" />
    </Svg>
  );
}

export function School({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M48 10v12" stroke={P.ink} strokeWidth="2.5" />
      <path d="M48 10h14l-3 4 3 4H48" fill={P.coral} />
      <path d="M14 42 48 22l34 20" fill={P.sky} stroke={P.blue} strokeWidth="3" />
      <rect x="18" y="40" width="60" height="42" rx="3" fill={P.white} stroke={P.blue} strokeWidth="3" />
      <circle cx="48" cy="46" r="7" fill={P.butter} stroke={P.amber} strokeWidth="2.5" />
      <path d="M48 42v4l3 2" stroke={P.ink} strokeWidth="2" />
      <rect x="24" y="56" width="10" height="9" rx="2" fill={P.sky} />
      <rect x="62" y="56" width="10" height="9" rx="2" fill={P.sky} />
      <rect x="41" y="62" width="14" height="20" rx="3" fill={P.blue} />
      <path d="M10 82h76" stroke={P.ink} strokeWidth="3" />
    </Svg>
  );
}

export function Homework({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="18" y="14" width="50" height="66" rx="5" fill={P.white} stroke={P.amber} strokeWidth="3" />
      <rect x="18" y="14" width="10" height="66" rx="4" fill={P.butter} />
      <path d="M36 32h22M36 42h22M36 52h14" stroke={P.line} strokeWidth="3" />
      <path d="M36 32h12" stroke={P.amber} strokeWidth="3" />
      <g transform="rotate(35 66 60)">
        <rect x="60" y="30" width="12" height="44" rx="3" fill={P.blue} />
        <rect x="60" y="30" width="12" height="7" rx="3" fill={P.coral} />
        <path d="m60 74 6 10 6-10Z" fill={P.peach} />
        <path d="m64.5 81 1.5 3 1.5-3Z" fill={P.ink} />
      </g>
    </Svg>
  );
}

export function Food({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <ellipse cx="44" cy="62" rx="32" ry="14" fill={P.sky2} stroke={P.blue} strokeWidth="2.5" />
      <path d="M22 50h44a22 22 0 0 1-44 0Z" fill={P.white} stroke={P.blue} strokeWidth="3" />
      <path d="M28 50c3-6 9-8 16-8s13 2 16 8" fill={P.peach} />
      <circle cx="38" cy="47" r="3" fill={P.green} />
      <circle cx="50" cy="46" r="3" fill={P.coral} />
      <circle cx="74" cy="34" r="12" fill={P.coral} stroke="#E0533F" strokeWidth="2" />
      <path d="M74 22c0-4 2-6 5-7" stroke={P.green} strokeWidth="2.5" />
      <path d="M77 18c4-2 8 0 8 0s-4 4-8 2" fill={P.green} />
      <path d="M86 50v28M82 50v8a4 4 0 0 0 8 0v-8" stroke={P.ink} strokeWidth="2.5" />
    </Svg>
  );
}

export function Rest({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="16" y="34" width="56" height="30" rx="10" fill={P.mint} stroke={P.teal} strokeWidth="3" />
      <rect x="10" y="48" width="14" height="24" rx="6" fill={P.teal} />
      <rect x="64" y="48" width="14" height="24" rx="6" fill={P.teal} />
      <rect x="22" y="56" width="50" height="14" rx="5" fill={P.white} stroke={P.teal} strokeWidth="3" />
      <path d="M18 72v8M70 72v8" stroke={P.teal} strokeWidth="4" />
      <path d="M80 30h10v8a5 5 0 0 1-10 0Z" fill={P.butter} stroke={P.amber} strokeWidth="2" />
      <path d="M83 24c0-3 3-3 3-6M87 24c0-3 2-3 2-5" stroke={P.line} strokeWidth="2" />
    </Svg>
  );
}

export function Reading({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M48 26c-10-6-24-8-36-6v52c12-2 26 0 36 6Z" fill={P.white} stroke={P.teal} strokeWidth="3" />
      <path d="M48 26c10-6 24-8 36-6v52c-12-2-26 0-36 6Z" fill={P.mint} stroke={P.teal} strokeWidth="3" />
      <path d="M20 34c8-1 16 0 22 3M20 44c8-1 16 0 22 3M20 54c8-1 16 0 22 3" stroke={P.line} strokeWidth="2.5" />
      <path d="M56 37c6-3 14-4 22-3M56 47c6-3 14-4 22-3" stroke={P.teal} strokeWidth="2.5" opacity=".5" />
      <path d="M66 20v22l5-4 5 4V20" fill={P.coral} />
    </Svg>
  );
}

export function Movement({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="52" cy="50" r="26" fill={P.white} stroke={P.green} strokeWidth="3" />
      <path d="m52 38 10 7-4 12H46l-4-12Z" fill={P.green} />
      <path d="M52 38V24M62 45l12-6M58 57l8 11M46 57l-8 11M42 45l-12-6" stroke={P.green} strokeWidth="2.5" />
      <path d="M8 40h12M4 52h14M10 64h10" stroke={P.lime} strokeWidth="4" />
      <ellipse cx="52" cy="84" rx="18" ry="3" fill={P.line} opacity=".6" />
    </Svg>
  );
}

export function Play({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="14" y="52" width="28" height="28" rx="5" fill={P.sky} stroke={P.blue} strokeWidth="3" />
      <rect x="46" y="52" width="28" height="28" rx="5" fill={P.butter} stroke={P.amber} strokeWidth="3" />
      <rect x="30" y="20" width="28" height="28" rx="5" fill={P.peach} stroke={P.coral} strokeWidth="3" transform="rotate(-8 44 34)" />
      <circle cx="28" cy="66" r="4" fill={P.blue} />
      <path d="m60 60 6 12h-12Z" fill={P.amber} />
      <rect x="39" y="29" width="10" height="10" rx="2" fill={P.coral} transform="rotate(-8 44 34)" />
      <path d="M78 26c4 0 6 3 6 6s-3 6-6 6" stroke={P.teal} strokeWidth="3" />
    </Svg>
  );
}

export function Screen({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="14" y="18" width="68" height="48" rx="6" fill={P.ink} />
      <rect x="19" y="23" width="58" height="38" rx="3" fill={P.sky} />
      <path d="M43 34v16l13-8Z" fill={P.blue} />
      <path d="M40 66h16l3 12H37Z" fill={P.line} />
      <path d="M30 80h36" stroke={P.ink} strokeWidth="3" />
      <path d="M19 30c6 0 10-4 12-7" stroke={P.white} strokeWidth="2" opacity=".6" />
    </Svg>
  );
}

export function Free({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="74" cy="22" r="9" fill={P.butter} stroke={P.amber} strokeWidth="2.5" />
      <path d="M74 7v4M74 33v4M59 22h4M85 22h4" stroke={P.amber} strokeWidth="2.5" />
      <path d="M30 14 52 30 40 56 18 40Z" fill={P.sky} stroke={P.blue} strokeWidth="3" />
      <path d="M30 14 40 56M52 30 18 40" stroke={P.blue} strokeWidth="2" />
      <path d="M40 56c-2 8 6 10 4 18s-10 8-8 14" stroke={P.ink} strokeWidth="2" />
      <path d="m43 64 5-2-1 5ZM39 76l5 1-4 3Z" fill={P.coral} />
      <path d="M8 86h80" stroke={P.green} strokeWidth="3" />
    </Svg>
  );
}

export const ACTIVITY_ART: Record<WithFree, (p: { size?: number }) => JSX.Element> = {
  sleep: Sleep,
  school: School,
  homework: Homework,
  food: Food,
  rest: Rest,
  reading: Reading,
  movement: Movement,
  play: Play,
  screen: Screen,
  free: Free,
};

/** Иллюстрацияның фон түсі (карточкалар үшін). */
export const ACTIVITY_TINT: Record<WithFree, string> = {
  sleep: '#F3F0FF',
  school: '#EEF4FF',
  homework: '#FFF7E6',
  food: '#FFF1EC',
  rest: '#E9FAF6',
  reading: '#E9FAF6',
  movement: '#F3FBE6',
  play: '#FFF7E6',
  screen: '#EEF4FF',
  free: '#F1F5F9',
};

/* ---------- Бөлім иллюстрациялары ---------- */

export function ArtMyDay({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="12" y="20" width="56" height="58" rx="8" fill={P.white} stroke={P.blue} strokeWidth="3" />
      <rect x="12" y="20" width="56" height="14" rx="7" fill={P.blue} />
      <path d="M26 14v12M54 14v12" stroke={P.ink} strokeWidth="3" />
      <rect x="20" y="42" width="12" height="10" rx="2" fill={P.mint} />
      <rect x="36" y="42" width="12" height="10" rx="2" fill={P.butter} />
      <rect x="20" y="58" width="12" height="10" rx="2" fill={P.sky} />
      <circle cx="68" cy="66" r="18" fill={P.white} stroke={P.teal} strokeWidth="3" />
      <path d="M68 56v10l7 4" stroke={P.ink} strokeWidth="3" />
    </Svg>
  );
}

export function ArtExperiment({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M38 12h20M42 12v24L22 74a6 6 0 0 0 5 9h42a6 6 0 0 0 5-9L54 36V12" fill={P.white} stroke={P.teal} strokeWidth="3" />
      <path d="M30 60h36l8 14a6 6 0 0 1-5 9H27a6 6 0 0 1-5-9Z" fill={P.mint} />
      <path d="M58 46h8M60 54h6M56 38h8" stroke={P.teal} strokeWidth="2.5" />
      <circle cx="40" cy="70" r="4" fill={P.teal} opacity=".6" />
      <circle cx="52" cy="66" r="3" fill={P.teal} opacity=".6" />
      <circle cx="76" cy="22" r="10" fill={P.butter} stroke={P.amber} strokeWidth="2.5" />
      <path d="M76 16v6l4 2" stroke={P.ink} strokeWidth="2" />
    </Svg>
  );
}

export function ArtHelper({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="12" y="14" width="50" height="64" rx="6" fill={P.white} stroke={P.blue} strokeWidth="3" />
      <rect x="20" y="24" width="24" height="7" rx="3" fill={P.butter} />
      <rect x="20" y="37" width="32" height="7" rx="3" fill={P.mint} />
      <rect x="20" y="50" width="18" height="7" rx="3" fill={P.sky} />
      <circle cx="62" cy="58" r="16" fill={P.white} stroke={P.ink} strokeWidth="4" />
      <path d="m55 58 5 5 9-10" stroke={P.green} strokeWidth="4" />
      <path d="m74 70 12 12" stroke={P.ink} strokeWidth="7" />
    </Svg>
  );
}

export function ArtMath({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="40" cy="44" r="28" fill={P.white} stroke={P.blue} strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={40 + 22 * Math.sin(a)} cy={44 - 22 * Math.cos(a)} r={i % 3 === 0 ? 2.4 : 1.4} fill={P.ink} />;
      })}
      <path d="M40 44V28M40 44l11 6" stroke={P.ink} strokeWidth="3" />
      <rect x="58" y="58" width="30" height="26" rx="6" fill={P.butter} stroke={P.amber} strokeWidth="2.5" />
      <path d="M66 66h14M73 59v14M66 77h14" stroke={P.amber} strokeWidth="3" />
    </Svg>
  );
}

export function ArtResearch({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="16" y="12" width="56" height="70" rx="6" fill={P.white} stroke={P.teal} strokeWidth="3" />
      <path d="M28 12v70" stroke={P.mint} strokeWidth="4" />
      <path d="M36 28h26M36 38h20" stroke={P.line} strokeWidth="3" />
      <rect x="36" y="58" width="6" height="14" rx="1.5" fill={P.amber} />
      <rect x="46" y="50" width="6" height="22" rx="1.5" fill={P.teal} />
      <rect x="56" y="54" width="6" height="18" rx="1.5" fill={P.blue} />
      <g transform="rotate(30 78 54)">
        <rect x="73" y="30" width="10" height="38" rx="3" fill={P.coral} />
        <path d="m73 68 5 8 5-8Z" fill={P.peach} />
      </g>
    </Svg>
  );
}

export function ArtResults({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M14 82h70M14 82V16" stroke={P.ink} strokeWidth="3" />
      <rect x="22" y="56" width="12" height="24" rx="3" fill={P.sky} />
      <rect x="40" y="44" width="12" height="36" rx="3" fill={P.mint} />
      <rect x="58" y="30" width="12" height="50" rx="3" fill={P.butter} />
      <path d="m24 46 18-12 16 6 20-20" stroke={P.blue} strokeWidth="3" />
      <circle cx="78" cy="20" r="4" fill={P.blue} />
    </Svg>
  );
}

export function ArtShow({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="12" y="14" width="72" height="48" rx="5" fill={P.white} stroke={P.blue} strokeWidth="3" />
      <path d="M24 50 38 36l10 8 20-18" stroke={P.teal} strokeWidth="3.5" />
      <circle cx="68" cy="26" r="4" fill={P.teal} />
      <path d="M48 62v10M36 86l12-14 12 14" stroke={P.ink} strokeWidth="3" />
      <path d="M8 14h80" stroke={P.ink} strokeWidth="3" />
    </Svg>
  );
}
