import { useState } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExperimentShell, ParamRow } from './Shell';
import { ChartFrame, ChartTooltip, DataTable, axisProps, gridProps } from '../components/charts';
import { Formula, Legend, MinutesInput, Stat } from '../components/ui';
import { distribution } from '../core/experiments';
import { fmtNumber } from '../core/format';
import { C, METRIC_COLORS } from '../lib/palette';

const DEMO = { window: 180, homework: 60, reading: 20, movement: 30, rest: 30 };
type P = typeof DEMO;
const PARTS: Array<{ k: keyof Omit<P, 'window'>; label: string; color: string; group: string }> = [
  { k: 'homework', label: 'Үй тапсырмасы', color: METRIC_COLORS.homework, group: 'пайдалы' },
  { k: 'reading', label: 'Кітап оқу', color: METRIC_COLORS.reading, group: 'пайдалы' },
  { k: 'movement', label: 'Қозғалыс', color: METRIC_COLORS.movement, group: 'пайдалы' },
  { k: 'rest', label: 'Демалыс', color: C.teal, group: 'қажетті' },
];
const USEFUL = ['homework', 'reading', 'movement'];

export default function Exp2() {
  const [p, setP] = useState<P>(DEMO);
  const set = (k: keyof P) => (v: number) => setP((x) => ({ ...x, [k]: Math.max(0, v) }));
  const parts = { homework: p.homework, reading: p.reading, movement: p.movement, rest: p.rest };
  const d = distribution(p.window, parts, USEFUL);
  const base = distribution(DEMO.window, { homework: 60, reading: 20, movement: 30, rest: 30 }, USEFUL);
  const demo = JSON.stringify(p) === JSON.stringify(DEMO);
  const chartData = [...PARTS.map((x) => ({ name: x.label, v: parts[x.k], color: x.color })), { name: 'Резерв', v: Math.max(0, d.reserve), color: C.slateLight }];

  const conclusion = !d.valid
    ? `Таңдалған уақыттар терезеден ${-d.reserve} минутқа асып кетті: жоспар орындалмайды. Бір әрекетті қысқарту немесе терезені ұлғайту керек.`
    : d.reserve === 0
      ? 'Резерв қалмады: күтпеген жағдайға уақыт жоқ. Зерттеу ұсынысы бойынша әр күнге резерв қалдырған жөн.'
      : `«Қажетті + пайдалы + қор» қағидасы орындалды: пайдалы уақыт ${d.useful} мин, демалыс ${p.rest} мин, резерв ${d.reserve} мин (терезенің ${fmtNumber((d.reserve / p.window) * 100)}%). Кітап оқуды көбейту резервтің есебінен ғана мүмкін — басқа әрекеттер өздігінен азаймайды.`;

  return (
    <ExperimentShell
      n={2}
      title="Кітап, үй тапсырмасы және демалыс"
      goal="Бос уақытты кітап оқу, үй тапсырмасы, қозғалыс және демалыс арасында теңгерімді бөлуді зерттеу; резерв пен тиімділік коэффициентін есептеу."
      demo={demo}
      source="зерттеу жұмысы, 2.3: 60 + 20 + 30 + 30 = 140 мин; 180 − 140 = 40 мин"
      initial={<DataTable head={['Әрекет', 'Минут']} rows={[['Терезе (16:00–19:00)', 180], ['Үй тапсырмасы', 60], ['Кітап оқу', 20], ['Қозғалыс', 30], ['Демалыс', 30]]} />}
      params={
        <div className="divide-y divide-line">
          <ParamRow label="Терезе W">
            <MinutesInput label="Терезе" value={p.window} onChange={set('window')} max={600} compact />
          </ParamRow>
          {PARTS.map((x) => (
            <ParamRow key={x.k} label={`${x.label} (${x.group})`} color={x.color}>
              <MinutesInput label={x.label} value={p[x.k]} onChange={set(x.k)} max={p.window} compact />
            </ParamRow>
          ))}
        </div>
      }
      calc={
        <div className="space-y-3">
          <Formula label="Жоспарланған">Σ = {Object.values(parts).join(' + ')} = {d.used} мин</Formula>
          <Formula label="Резерв (қор)">
            R = {p.window} − {d.used} = <b className={d.reserve < 0 ? 'text-danger' : 'text-teal'}>{d.reserve}</b> мин
          </Formula>
          <Formula label="K = пайдалы / W × 100%">
            K = ({p.homework} + {p.reading} + {p.movement}) / {p.window} × 100% ≈ {d.k === null ? '—' : fmtNumber(d.k)}%
          </Formula>
          <p className="text-xs text-ink-3">K — тек жобадағы салыстыруға арналған шартты көрсеткіш, медициналық немесе психологиялық көрсеткіш емес.</p>
        </div>
      }
      chart={
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink-2">Терезенің бөлінуі ({p.window} мин)</div>
            <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-lg bg-soft-2" role="img" aria-label={chartData.map((c) => `${c.name} ${c.v} мин`).join(', ')}>
              {chartData.map((c) => (
                <motion.div key={c.name} className="h-full first:rounded-l-lg last:rounded-r-lg" animate={{ width: `${(c.v / Math.max(p.window, d.used)) * 100}%` }} transition={{ duration: 0.4 }} style={{ background: c.color }} title={`${c.name}: ${c.v} мин`} />
              ))}
            </div>
            <div className="mt-2">
              <Legend items={chartData.map((c) => ({ color: c.color, label: `${c.name} ${c.v}` }))} />
            </div>
          </div>
          <ChartFrame title="Әр әрекеттің үлесі, %" table={{ head: ['Әрекет', 'Минут', '%'], rows: chartData.map((c) => [c.name, c.v, fmtNumber((c.v / p.window) * 100)]) }} height={210}>
            <ResponsiveContainer>
              <BarChart data={chartData.map((c) => ({ ...c, pct: Math.round((c.v / p.window) * 1000) / 10 }))} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} fontSize={11} />
                <YAxis {...axisProps} unit="%" />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: '#F6F9FC' }} />
                <Bar dataKey="pct" name="Үлес" radius={[4, 4, 0, 0]}>
                  {chartData.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      }
      comparison={
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Резерв: зерттеу" value={base.reserve} unit="мин" />
          <Stat label="Резерв: қазір" value={d.reserve} unit="мин" tone={d.reserve < 0 ? 'danger' : 'teal'} />
          <Stat label="Айырма" value={d.reserve - base.reserve} unit="мин" tone="brand" />
        </div>
      }
      conclusion={conclusion}
      snapshot={() => ({ params: p, results: { used: d.used, reserve: d.reserve, k: d.k } })}
      onReset={() => setP(DEMO)}
      onLoad={(x) => setP({ ...DEMO, ...(x as Partial<P>) })}
    />
  );
}
