import { motion, useReducedMotion } from 'motion/react';
import { formatHM } from '../core/time';
import { cx } from './ui';

export interface TimelineItem {
  id: string;
  label: string;
  start: number;
  end: number; // end > start (түн ортасы алдын ала бөлінген)
  color: string;
  dashed?: boolean;
  danger?: boolean;
  muted?: boolean;
}

/** Уақыт сызығы. Қабаттасатын блоктар бөлек жолдарға түседі. */
export function Timeline({ items, from, to, tickEvery = 60, height = 34, label }: { items: TimelineItem[]; from: number; to: number; tickEvery?: number; height?: number; label: string }) {
  const reduce = useReducedMotion();
  const span = Math.max(1, to - from);
  const lanes: TimelineItem[][] = [];
  for (const it of [...items].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const lane = lanes.find((l) => l[l.length - 1].end <= it.start);
    if (lane) lane.push(it);
    else lanes.push([it]);
  }
  const ticks: number[] = [];
  for (let t = Math.ceil(from / tickEvery) * tickEvery; t <= to; t += tickEvery) ticks.push(t);
  const pct = (m: number) => ((m - from) / span) * 100;

  return (
    <div className="w-full" role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${formatHM(i.start)}–${formatHM(i.end)}`).join('; ')}`}>
      <div className="relative rounded-xl border border-line bg-soft/60 p-1.5" style={{ minHeight: Math.max(1, lanes.length) * (height + 4) + 8 }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${pct(t)}%` }} aria-hidden />
        ))}
        {lanes.map((lane, li) =>
          lane.map((it) => (
            <motion.div
              key={it.id}
              title={`${it.label}: ${formatHM(it.start)}–${formatHM(it.end)} (${it.end - it.start} мин)`}
              initial={reduce ? false : { opacity: 0, scaleX: 0.85 }}
              animate={{ opacity: 1, scaleX: 1, left: `calc(${pct(it.start)}% + 1px)`, width: `calc(${(Math.max(0, it.end - it.start) / span) * 100}% - 2px)` }}
              transition={{ duration: reduce ? 0 : 0.35 }}
              className={cx('absolute flex items-center overflow-hidden rounded-md px-1.5 text-[11.5px] font-medium', it.muted ? 'text-ink-2' : 'text-white', it.danger && 'ring-2 ring-danger ring-offset-1')}
              style={{
                top: 6 + li * (height + 4),
                height,
                background: it.dashed ? `repeating-linear-gradient(135deg, ${it.color}, ${it.color} 6px, #ffffff 6px, #ffffff 9px)` : it.color,
                transformOrigin: 'left',
              }}
            >
              <span className="truncate" style={it.dashed ? { background: 'rgba(255,255,255,.85)', color: '#17263C', borderRadius: 4, padding: '0 3px' } : undefined}>
                {it.label}
              </span>
            </motion.div>
          )),
        )}
      </div>
      <div className="relative mt-1 h-4 font-mono text-[10.5px] text-ink-3" aria-hidden>
        {ticks.map((t, i) => (
          <span key={t} className={cx('absolute -translate-x-1/2', (i === 0 || i === ticks.length - 1) && 'hidden sm:inline')} style={{ left: `${pct(t)}%` }}>
            {t === 1440 ? '24:00' : formatHM(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
