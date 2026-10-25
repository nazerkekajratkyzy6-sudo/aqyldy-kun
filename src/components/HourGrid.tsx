import { useMemo, useState } from 'react';
import { MINUTES_PER_DAY, splitHM } from '../core/time';
import { fmtNumber } from '../core/format';
import { AnimatedNumber, Slider, cx } from './ui';

/**
 * 24 × 60 = 1440 моделі: әр нүкте — 1 минут, әр шаршы — 1 сағат.
 * Оқушы сағат санын таңдап, оның минутқа айналуын және қалған минутты көреді.
 */
export function HourGrid({ initial = 180, compact = false }: { initial?: number; compact?: boolean }) {
  const [minutes, setMinutes] = useState(initial);
  const { hours, minutes: rest } = splitHM(minutes);
  const remainder = MINUTES_PER_DAY - minutes;

  const cells = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);
  const dot = compact ? 3.2 : 4;
  const gapD = compact ? 1.6 : 2;
  const cellW = 10 * dot + 9 * gapD;
  const cellH = 6 * dot + 5 * gapD;

  return (
    <div className="flex flex-col gap-5">
      <div className={cx('grid gap-2', compact ? 'grid-cols-6' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8')} role="group" aria-label="24 сағат, әр сағатта 60 минут">
        {cells.map((h) => {
          const filled = Math.max(0, Math.min(60, minutes - h * 60));
          return (
            <button
              key={h}
              type="button"
              onClick={() => setMinutes((h + 1) * 60 === minutes ? h * 60 : (h + 1) * 60)}
              className={cx('group rounded-lg border p-1.5 text-left transition-colors', filled === 60 ? 'border-brand/40 bg-brand-50' : filled > 0 ? 'border-amber/50 bg-amber-50' : 'border-line bg-white hover:border-line-2')}
              aria-label={`${h + 1}-сағат: ${filled} минут таңдалған. Басу — ${h + 1} сағатқа дейін таңдау`}
            >
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-ink-3">
                <span>{String(h).padStart(2, '0')}:00</span>
                <span className={cx(filled === 60 ? 'text-brand' : '')}>{filled}</span>
              </div>
              <svg viewBox={`0 0 ${cellW} ${cellH}`} width="100%" aria-hidden>
                {Array.from({ length: 60 }, (_, i) => {
                  const x = (i % 10) * (dot + gapD) + dot / 2;
                  const y = Math.floor(i / 10) * (dot + gapD) + dot / 2;
                  const on = i < filled;
                  return <circle key={i} cx={x} cy={y} r={dot / 2} fill={on ? (filled === 60 ? '#2563EB' : '#D97706') : '#E3E9F1'} style={{ transition: `fill .25s ${Math.min(i * 4, 200)}ms` }} />;
                })}
              </svg>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-2">Таңдалған уақыт</span>
            <span className="font-mono text-ink-3">
              {hours} сағ {rest} мин
            </span>
          </div>
          <Slider value={minutes} max={MINUTES_PER_DAY} step={5} onChange={setMinutes} label="Таңдалған минут саны" valueText={`${minutes} минут`} />
        </div>
        <div className="rounded-xl border border-line bg-soft px-4 py-3 font-mono text-[15px] leading-7">
          <div>
            {hours} × 60 + {rest} = <b className="text-brand"><AnimatedNumber value={minutes} /></b> мин
          </div>
          <div>
            1440 − {fmtNumber(minutes, 0)} = <b className="text-teal"><AnimatedNumber value={remainder} /></b> мин қалды
          </div>
        </div>
      </div>
      <p className="text-sm text-ink-3">Әр нүкте — 1 минут. Бір шаршыда 60 нүкте (1 сағат), барлығы 24 шаршы: 24 × 60 = 1440 нүкте.</p>
    </div>
  );
}
