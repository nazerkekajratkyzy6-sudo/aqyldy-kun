import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { fmtNumber } from '../core/format';
import { formatDuration } from '../core/time';

export interface RingSegment {
  id: string;
  label: string;
  minutes: number;
  color: string;
}

/**
 * Тәулік шеңбері: әр әрекет — доға, ұзындығы минутқа пропорционал.
 * Қалған уақыт (R) сұр штрихпен көрсетіледі.
 */
export function DayRing({ segments, total = 1440, size = 300, center, showHours = true, remainderLabel = 'Қалған уақыт R' }: { segments: RingSegment[]; total?: number; size?: number; center?: ReactNode; showHours?: boolean; remainderLabel?: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const stroke = size * 0.11;
  const r = size / 2 - stroke / 2 - (showHours ? 18 : 4);
  const c = 2 * Math.PI * r;
  const gap = segments.filter((s) => s.minutes > 0).length > 1 ? 2 : 0;
  const used = segments.reduce((s, x) => s + x.minutes, 0);
  const remainder = Math.max(0, total - used);
  let acc = 0;
  const arcs = segments
    .filter((s) => s.minutes > 0)
    .map((s) => {
      const start = acc;
      acc += s.minutes;
      const len = Math.max(0, (s.minutes / total) * c - gap);
      return { ...s, len, offset: -(start / total) * c };
    });
  const remLen = (remainder / total) * c;
  const remOffset = -(used / total) * c;
  const hovered = hover === '__rem' ? { label: remainderLabel, minutes: remainder } : segments.find((s) => s.id === hover);
  const t = reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label={`Тәулік диаграммасы: ${segments.map((s) => `${s.label} ${s.minutes} мин`).join(', ')}; қалған ${remainder} мин`}>
        {showHours &&
          Array.from({ length: 24 }, (_, h) => {
            const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const R1 = size / 2 - 6;
            const R0 = R1 - (h % 6 === 0 ? 9 : 5);
            const ri = r - stroke / 2 - 11;
            const lx = size / 2 + ri * Math.cos(a);
            const ly = size / 2 + ri * Math.sin(a);
            return (
              <g key={h}>
                <line x1={size / 2 + R0 * Math.cos(a)} y1={size / 2 + R0 * Math.sin(a)} x2={size / 2 + R1 * Math.cos(a)} y2={size / 2 + R1 * Math.sin(a)} stroke={h % 6 === 0 ? '#6B7A90' : '#CFD8E4'} strokeWidth={h % 6 === 0 ? 2 : 1.25} strokeLinecap="round" />
                {h % 6 === 0 && size >= 240 && (
                  <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fill="#6B7A90" fontFamily="var(--font-mono)">
                    {String(h).padStart(2, '0')}
                  </text>
                )}
              </g>
            );
          })}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          {remainder > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth={stroke * 0.42}
              strokeDasharray={`${Math.max(0, remLen - gap)} ${c}`}
              initial={false}
              animate={{ strokeDashoffset: remOffset, strokeDasharray: `${Math.max(0, remLen - gap)} ${c}` }}
              transition={t}
              onMouseEnter={() => setHover('__rem')}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            />
          )}
          {arcs.map((a) => (
            <motion.circle
              key={a.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.id ? stroke + 6 : stroke}
              initial={false}
              animate={{ strokeDasharray: `${a.len} ${c}`, strokeDashoffset: a.offset }}
              transition={t}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default', transition: 'stroke-width .15s' }}
            />
          ))}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="max-w-[60%]">
          {hovered ? (
            <>
              <div className="text-sm font-medium text-ink-2">{hovered.label}</div>
              <div className="font-display text-3xl font-semibold tnum">{fmtNumber(hovered.minutes, 0)}</div>
              <div className="text-xs text-ink-3">
                мин · {formatDuration(hovered.minutes)} · {fmtNumber((hovered.minutes / total) * 100)}%
              </div>
            </>
          ) : (
            center
          )}
        </div>
      </div>
    </div>
  );
}
