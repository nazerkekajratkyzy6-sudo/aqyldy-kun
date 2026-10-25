import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { fmtNumber } from '../core/format';
import { C } from '../lib/palette';
import { Legend, cx } from './ui';

export const axisProps = {
  stroke: C.grid,
  tick: { fill: C.axis, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: C.grid },
} as const;

export const gridProps = { stroke: '#EEF3F9', vertical: false } as const;

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Recharts үшін тұрақты көмекші терезе: мәтін — қара, түс — тек белгіде. */
export function ChartTooltip({ active, payload, label, unit = 'мин', labelFormatter }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; unit?: string; labelFormatter?: (l: string | number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</div>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="inline-block size-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-mono font-semibold text-ink tnum">{typeof p.value === 'number' ? fmtNumber(p.value) : p.value} {unit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Диаграмма + кесте көрінісі (қолжетімділік үшін). */
export function ChartFrame({ title, legend, children, table, height = 280, actions, note }: { title: ReactNode; legend?: Array<{ color: string; label: string; dashed?: boolean }>; children: ReactNode; table: { head: string[]; rows: Array<Array<ReactNode>> }; height?: number; actions?: ReactNode; note?: ReactNode }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="font-display text-[15px] font-semibold">{title}</figcaption>
        <div className="flex items-center gap-2">
          {actions}
          <div className="inline-flex rounded-lg border border-line p-0.5" role="group" aria-label="Көрініс">
            <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')} className={cx('grid size-7 place-items-center rounded-md', view === 'chart' ? 'bg-brand-50 text-brand' : 'text-ink-3')} aria-label="Диаграмма">
              <BarChart3 size={15} />
            </button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={cx('grid size-7 place-items-center rounded-md', view === 'table' ? 'bg-brand-50 text-brand' : 'text-ink-3')} aria-label="Кесте">
              <Table2 size={15} />
            </button>
          </div>
        </div>
      </div>
      {legend && legend.length > 1 && <Legend items={legend} />}
      {view === 'chart' ? (
        <div style={{ height }} className="w-full">
          {children}
        </div>
      ) : (
        <div className="max-h-[360px] overflow-auto rounded-xl border border-line">
          <DataTable head={table.head} rows={table.rows} />
        </div>
      )}
      {note && <div className="text-xs text-ink-3">{note}</div>}
    </figure>
  );
}

export function DataTable({ head, rows, className }: { head: string[]; rows: Array<Array<ReactNode>>; className?: string }) {
  return (
    <div className="max-w-full overflow-x-auto">
    <table className={cx('w-full border-collapse text-sm', className)}>
      <thead className="bg-soft">
        <tr>
          {head.map((h, i) => (
            <th key={h + i} scope="col" className={cx('border-b border-line px-3 py-2 font-semibold text-ink-2', i === 0 ? 'text-left' : 'text-right')}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="odd:bg-white even:bg-soft/50">
            {r.map((c, ci) => (
              <td key={ci} className={cx('border-b border-line/70 px-3 py-1.5', ci === 0 ? 'text-left' : 'text-right font-mono tnum')}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
