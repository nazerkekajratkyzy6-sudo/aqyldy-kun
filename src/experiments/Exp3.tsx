import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExperimentShell } from './Shell';
import { ChartFrame, ChartTooltip, DataTable, axisProps, gridProps } from '../components/charts';
import { Formula, MinutesInput, Stat } from '../components/ui';
import { planFact } from '../core/experiments';
import { fmtPercent, fmtSigned } from '../core/format';
import { C, FACT_COLOR, PLAN_COLOR } from '../lib/palette';
import { SAMPLE_PLAN_FACT } from '../data/research';

type Row = (typeof SAMPLE_PLAN_FACT)[number];

export default function Exp3() {
  const [rows, setRows] = useState<Row[]>(SAMPLE_PLAN_FACT);
  const r = planFact(rows);
  const demo = JSON.stringify(rows) === JSON.stringify(SAMPLE_PLAN_FACT);
  const set = (id: string, k: 'plan' | 'fact', v: number) => setRows((rs) => rs.map((x) => (x.id === id ? { ...x, [k]: Math.max(0, v) } : x)));

  const over = r.rows.filter((x) => x.delta > 0);
  const under = r.rows.filter((x) => x.delta < 0);
  const conclusion = r.absDev === 0
    ? 'Барлық әрекет жоспар бойынша орындалды: Δ = 0.'
    : `Ең үлкен ауытқу — «${r.biggest!.label}»: Δ = ${fmtSigned(r.biggest!.delta, 0)} мин. Жоспардан артық: ${over.map((x) => `${x.label} (${fmtSigned(x.delta, 0)})`).join(', ') || 'жоқ'}; кем: ${under.map((x) => `${x.label} (${fmtSigned(x.delta, 0)})`).join(', ') || 'жоқ'}. Мақсат — баланы кінәлау емес, уақыттың қайда кеткенін математикалық түрде көру.`;

  return (
    <ExperimentShell
      n={3}
      title="Жоспар және факт"
      goal="Жоспарланған және нақты жұмсалған уақытты салыстырып, әр әрекет бойынша айырманы Δ = факт − жоспар есептеу."
      demo={demo}
      source="зерттеу жұмысы, 2.2-кесте"
      initial={<DataTable head={['Әрекет', 'Жоспар', 'Нақты']} rows={SAMPLE_PLAN_FACT.map((x) => [x.label, x.plan, x.fact])} />}
      params={
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-3">
              <tr>
                <th className="pb-1 text-left">Әрекет</th>
                <th className="pb-1 text-left">Жоспар</th>
                <th className="pb-1 text-left">Нақты</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-medium">{x.label}</td>
                  <td className="py-1.5 pr-2">
                    <MinutesInput label={`${x.label}: жоспар`} value={x.plan} onChange={(v) => set(x.id, 'plan', v)} compact />
                  </td>
                  <td className="py-1.5">
                    <MinutesInput label={`${x.label}: нақты`} value={x.fact} onChange={(v) => set(x.id, 'fact', v)} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      calc={
        <div className="space-y-2">
          {r.rows.map((x) => (
            <Formula key={x.id}>
              Δ<sub>{x.label}</sub> = {x.fact} − {x.plan} = <b className={x.delta > 0 ? 'text-danger' : x.delta < 0 ? 'text-brand' : ''}>{fmtSigned(x.delta, 0)}</b> мин{x.pct !== null && <span className="text-ink-3"> ({fmtPercent(x.pct, 1, true)})</span>}
            </Formula>
          ))}
          <Formula label="Қосынды">
            Σжоспар = {r.planSum}; Σфакт = {r.factSum}; ΣΔ = {fmtSigned(r.totalDelta, 0)} мин
          </Formula>
        </div>
      }
      chart={
        <div className="space-y-5">
          <ChartFrame
            title="Жоспар мен нақты, мин"
            legend={[
              { color: PLAN_COLOR, label: 'Жоспар' },
              { color: FACT_COLOR, label: 'Нақты' },
            ]}
            table={{ head: ['Әрекет', 'Жоспар', 'Нақты', 'Δ'], rows: r.rows.map((x) => [x.label, x.plan, x.fact, fmtSigned(x.delta, 0)]) }}
            height={220}
          >
            <ResponsiveContainer>
              <BarChart data={r.rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval={0} fontSize={11} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                <Bar dataKey="plan" name="Жоспар" fill={PLAN_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="fact" name="Нақты" fill={FACT_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <ChartFrame title="Айырма Δ = факт − жоспар" table={{ head: ['Әрекет', 'Δ'], rows: r.rows.map((x) => [x.label, fmtSigned(x.delta, 0)]) }} height={180} note="Оң Δ — жоспардан артық уақыт, теріс Δ — жоспардан кем.">
            <ResponsiveContainer>
              <BarChart data={r.rows} layout="vertical" margin={{ top: 4, right: 16, left: 20, bottom: 0 }}>
                <CartesianGrid stroke="#EEF3F9" horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="label" {...axisProps} width={96} fontSize={11} />
                <ReferenceLine x={0} stroke={C.axis} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                <Bar dataKey="delta" name="Δ" radius={4}>
                  {r.rows.map((x) => (
                    <Cell key={x.id} fill={x.delta > 0 ? C.rose : C.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      }
      comparison={
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Σ|Δ| ауытқу" value={r.absDev} unit="мин" tone="amber" />
          <Stat label="Жоспардан артық" value={over.reduce((s, x) => s + x.delta, 0)} unit="мин" tone="danger" />
          <Stat label="Жоспардан кем" value={under.reduce((s, x) => s + x.delta, 0)} unit="мин" tone="brand" />
        </div>
      }
      conclusion={conclusion}
      snapshot={() => ({ params: { rows }, results: { deltas: r.rows.map((x) => ({ id: x.id, delta: x.delta })), absDev: r.absDev } })}
      onReset={() => setRows(SAMPLE_PLAN_FACT)}
      onLoad={(x) => Array.isArray((x as { rows?: Row[] }).rows) && setRows((x as { rows: Row[] }).rows)}
    />
  );
}
