import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExperimentShell, ParamRow } from './Shell';
import { ChartFrame, ChartTooltip, DataTable, axisProps } from '../components/charts';
import { Formula, MinutesInput, Stat, cx } from '../components/ui';
import { timeDeficit } from '../core/experiments';
import { C, METRIC_COLORS } from '../lib/palette';

interface Item {
  id: string;
  label: string;
  minutes: number;
  priority: number;
  flexible: boolean;
  color: string;
}
const DEMO = {
  window: 180,
  items: [
    { id: 'homework', label: 'Үй тапсырмасы', minutes: 60, priority: 1, flexible: false, color: METRIC_COLORS.homework },
    { id: 'reading', label: 'Кітап оқу', minutes: 20, priority: 1, flexible: false, color: METRIC_COLORS.reading },
    { id: 'movement', label: 'Қозғалыс', minutes: 30, priority: 2, flexible: false, color: METRIC_COLORS.movement },
    { id: 'rest', label: 'Демалыс', minutes: 30, priority: 2, flexible: false, color: C.teal },
    { id: 'screen', label: 'Экран', minutes: 60, priority: 3, flexible: true, color: METRIC_COLORS.screen },
  ] as Item[],
};

export default function Exp4() {
  const [p, setP] = useState(DEMO);
  const r = timeDeficit(p.window, p.items);
  const demo = JSON.stringify(p) === JSON.stringify(DEMO);
  const upd = (id: string, patch: Partial<Item>) => setP((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const after = p.items.map((i) => ({ ...i, after: i.minutes - (r.plan.find((c) => c.id === i.id)?.cut ?? 0) }));
  const chart = [
    { name: 'Қажет', ...Object.fromEntries(p.items.map((i) => [i.id, i.minutes])) },
    { name: 'Түзетілген', ...Object.fromEntries(after.map((i) => [i.id, i.after])) },
  ];

  const conclusion =
    r.deficit === 0
      ? `Тапшылық жоқ: қажет ${r.need} мин ≤ ${p.window} мин; ${r.surplus} мин резерв қалады.`
      : r.resolved
        ? `Уақыт тапшылығы D = ${r.deficit} мин. Оны икемді әрекеттерді басымдығы төменінен бастап қысқарту арқылы жоюға болады: ${r.plan.map((c) => `${c.label} −${c.cut} мин`).join(', ')}. Міндетті әрекеттер өзгермейді.`
        : `Уақыт тапшылығы D = ${r.deficit} мин; икемді әрекеттерді толық алып тастаса да ${r.unresolved} мин жетпейді. Міндетті әрекеттердің бірін басқа күнге ауыстыру немесе терезені ұлғайту қажет.`;

  return (
    <ExperimentShell
      n={4}
      title="Уақыт тапшылығы"
      goal="Жоспарланған әрекеттер бос уақыттан көп болғанда тапшылықты D = ΣT − W есептеп, оны басымдық бойынша жою жолын табу."
      demo={demo}
      source="зерттеу жұмысының 2.2–2.3 мәндері (терезе 180 мин, экран 60 мин) негізіндегі модельдік жағдай"
      initial={<DataTable head={['Әрекет', 'Минут', 'Басымдық', 'Икемді']} rows={DEMO.items.map((i) => [i.label, i.minutes, i.priority, i.flexible ? 'иә' : 'жоқ'])} />}
      params={
        <div className="divide-y divide-line">
          <ParamRow label="Терезе W">
            <MinutesInput label="Терезе" value={p.window} onChange={(v) => setP((x) => ({ ...x, window: Math.max(0, v) }))} max={600} compact />
          </ParamRow>
          {p.items.map((i) => (
            <div key={i.id} className="py-1.5">
              <ParamRow label={i.label} color={i.color}>
                <MinutesInput label={i.label} value={i.minutes} onChange={(v) => upd(i.id, { minutes: Math.max(0, v) })} compact />
              </ParamRow>
              <div className="flex flex-wrap items-center gap-3 pl-5 text-xs text-ink-2">
                <label className="flex items-center gap-1.5">
                  Басымдық
                  <select className="h-7 rounded-md border border-line-2 bg-white px-1" value={i.priority} onChange={(e) => upd(i.id, { priority: Number(e.target.value) })} aria-label={`${i.label}: басымдық`}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="size-4 accent-[#2563EB]" checked={i.flexible} onChange={(e) => upd(i.id, { flexible: e.target.checked })} />
                  икемді (қысқартуға болады)
                </label>
              </div>
            </div>
          ))}
        </div>
      }
      calc={
        <div className="space-y-3">
          <Formula label="Қажет уақыт">ΣT = {p.items.map((i) => i.minutes).join(' + ')} = {r.need} мин</Formula>
          <Formula label="Тапшылық">
            D = ΣT − W = {r.need} − {p.window} = <b className={cx(r.need - p.window > 0 ? 'text-danger' : 'text-teal')}>{r.need - p.window}</b> мин {r.need - p.window <= 0 && '(тапшылық жоқ)'}
          </Formula>
          {r.plan.length > 0 && (
            <Formula label="Қысқарту">
              {r.plan.map((c) => `${c.label}: −${c.cut}`).join('; ')} → Σ = {r.plan.reduce((s, c) => s + c.cut, 0)} мин
            </Formula>
          )}
        </div>
      }
      chart={
        <ChartFrame title="Қажет уақыт пен терезе" legend={p.items.map((i) => ({ color: i.color, label: i.label }))} table={{ head: ['Әрекет', 'Қажет', 'Түзетілген'], rows: after.map((i) => [i.label, i.minutes, i.after]) }} height={230} note={`Үзік сызық — терезе W = ${p.window} мин.`}>
          <ResponsiveContainer>
            <BarChart data={chart} layout="vertical" margin={{ top: 8, right: 20, left: 18, bottom: 0 }} barCategoryGap={22}>
              <CartesianGrid stroke="#EEF3F9" horizontal={false} />
              <XAxis type="number" {...axisProps} domain={[0, Math.max(p.window, r.need) + 10]} />
              <YAxis type="category" dataKey="name" {...axisProps} width={78} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
              {p.items.map((i) => (
                <Bar key={i.id} dataKey={i.id} name={i.label} stackId="a" fill={i.color} stroke="#fff" strokeWidth={2} />
              ))}
              <ReferenceLine x={p.window} stroke={C.ink} strokeDasharray="5 4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      }
      comparison={
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Қажет" value={r.need} unit="мин" />
          <Stat label="Терезе" value={p.window} unit="мин" />
          <Stat label={r.deficit ? 'Тапшылық D' : 'Резерв'} value={r.deficit || r.surplus} unit="мин" tone={r.deficit ? 'danger' : 'teal'} />
        </div>
      }
      conclusion={conclusion}
      snapshot={() => ({ params: p as unknown as Record<string, unknown>, results: { need: r.need, deficit: r.deficit, plan: r.plan, resolved: r.resolved } })}
      onReset={() => setP(DEMO)}
      onLoad={(x) => {
        const v = x as typeof DEMO;
        if (Array.isArray(v.items)) setP(v);
      }}
    />
  );
}
