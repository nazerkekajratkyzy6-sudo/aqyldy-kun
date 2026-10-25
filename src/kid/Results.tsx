import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileDown, Loader2 } from 'lucide-react';
import { KidShell, BigButton, SourceTag, ResultMessage } from './ui';
import { ArtResults } from './illustrations';
import { ChartTooltip, axisProps, gridProps } from '../components/charts';
import { METRICS, METRIC_LABELS, type Metric } from '../core/diary';
import { fmtNumber, fmtPercent } from '../core/format';
import { METRIC_COLORS, PLAN_COLOR, FACT_COLOR } from '../lib/palette';
import { cautiousConclusion, computeAnalytics, dayLabel } from '../lib/analytics';
import { useAppData } from '../store/AppData';
import { cx } from '../components/ui';

export default function Results() {
  const { entries, mode, setMode, author, toast } = useAppData();
  const [busy, setBusy] = useState(false);
  const hasPhases = entries.some((e) => e.phase === 'self') && entries.some((e) => e.phase === 'assistant');
  const a = useMemo(() => computeAnalytics(entries, hasPhases ? 'phase' : 'firstLast'), [entries, hasPhases]);
  const demo = mode === 'sample';
  const totals = METRICS.map((m) => ({ id: m, name: METRIC_LABELS[m], v: a.entries.reduce((s, e) => s + e.fact[m], 0) }));

  const pdf = async () => {
    setBusy(true);
    try {
      const { buildReport } = await import('../lib/pdf');
      await buildReport({ analytics: a, demo, author, filter: 'all', conclusions: cautiousConclusion(a, demo) });
      toast('Зерттеу есебі жүктелді');
    } catch {
      toast('Есепті жасау мүмкін болмады', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KidShell section="/results" title="Нәтижем" art={<ArtResults size={72} />} instruction="Бағанды бас — оның минуты көрінеді. Барлық есеп өзі шығады.">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['sample', 'Үлгілік тәжірибе'],
              ['real', 'Менің нақты зерттеуім'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className={cx('min-h-12 rounded-2xl border-2 px-3 text-[16px] font-semibold', mode === v ? (v === 'sample' ? 'border-amber bg-amber-50 text-amber-700' : 'border-teal bg-teal-50 text-teal') : 'border-line-2 text-ink-2')}>
              {l}
            </button>
          ))}
        </div>
        <SourceTag kind={demo ? 'demo' : 'real'} />
        <BigButton className="ml-auto" icon={busy ? <Loader2 size={19} className="animate-spin" /> : <FileDown size={19} />} onClick={pdf} disabled={busy || a.n === 0}>
          Зерттеу есебін жүктеу
        </BigButton>
      </div>

      {a.n === 0 ? (
        <div className="rounded-3xl border-2 border-line bg-soft/50 p-8 text-center">
          <p className="font-display text-2xl font-semibold">Әзірге нақты деректер жоқ</p>
          <p className="mx-auto mt-2 max-w-lg text-[17px] text-ink-2">Деректер болмаса, қорытынды да жасалмайды. «Менің зерттеуім» бөлімінде күндерді толтыр.</p>
          <Link to="/research" className="mt-5 inline-flex min-h-14 items-center rounded-2xl bg-brand px-6 text-[17px] font-semibold text-white">
            Менің зерттеуіме өту
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Card title="Уақыт неге кетті?" sub={`${a.n} күннің қосындысы, минут`}>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={totals} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" {...axisProps} interval={0} fontSize={12} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} trigger="click" />
                  <Bar dataKey="v" name="Барлығы" radius={[6, 6, 0, 0]}>
                    {totals.map((t) => (
                      <Cell key={t.id} fill={METRIC_COLORS[t.id as Metric]} />
                    ))}
                    <LabelList dataKey="v" position="top" fontSize={13} fill="#17263C" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[16px] text-ink-2">
              Орташа есеппен бір күнде: {METRICS.map((m) => `${METRIC_LABELS[m].toLocaleLowerCase('kk-KZ')} ${fmtNumber(a.avg[m] ?? 0)} мин`).join(', ')}.
            </p>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {(['screen', 'reading'] as const).map((m) => (
              <ChangeCard key={m} metric={m} a={a} />
            ))}
          </div>

          <Card title="Жоспар мен нақты күн" sub="Айырма = нақты − жоспар">
            {a.planFact.length === 0 ? (
              <ResultMessage tone="info">
                {demo ? 'Ғылыми жұмыстың 5 күндік мысалында жоспар жазылмаған.' : 'Күнделікке жоспар жазылмаған.'} «Менің зерттеуім» бөлімінде «+ Жоспарды да жазу» батырмасын бас.
              </ResultMessage>
            ) : (
              <PlanFact a={a} />
            )}
          </Card>

          {a.compare.method === 'phase' && a.compare.available && (
            <Card title="Өзім ↔ Көмекшімен" sub="Екі кезеңнің орташа мәндері">
              <div className="grid gap-3 sm:grid-cols-3">
                {(['screen', 'reading', 'unplanned'] as const).map((m) => {
                  const c = a.compare.byMetric[m];
                  return (
                    <div key={m} className="rounded-2xl border-2 border-line bg-white px-4 py-3">
                      <div className="text-[15px] text-ink-3">{METRIC_LABELS[m]}</div>
                      <div className="font-display text-2xl font-semibold tnum">
                        {fmtNumber(c.meanA ?? 0)} → {fmtNumber(c.meanB ?? 0)}
                      </div>
                      <div className="text-[15px] text-ink-2">айырма {c.diff !== null && c.diff > 0 ? '+' : ''}{fmtNumber(c.diff ?? 0)} мин · {fmtPercent(c.pct, 1, true)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="Қорытынды" sub="Сақ қорытынды: бір баланың бақылауы бәрін дәлелдемейді">
            <ul className="space-y-2 text-[17px] leading-relaxed">
              {cautiousConclusion(a, demo).map((c) => (
                <li key={c} className="flex gap-2.5">
                  <span className="mt-2.5 size-2 shrink-0 rounded-full bg-teal" />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-[15px] text-ink-3">
            Толық талдау (кезеңдерді салыстыру, сүзгілер): <Link to="/teacher/analytics" className="font-semibold text-brand underline underline-offset-4">ересектерге арналған бөлім</Link>.
          </p>
        </div>
      )}
    </KidShell>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-line bg-white p-5">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {sub && <p className="mb-3 text-[15px] text-ink-3">{sub}</p>}
      {children}
    </section>
  );
}

function ChangeCard({ metric, a }: { metric: 'screen' | 'reading'; a: ReturnType<typeof computeAnalytics> }) {
  const fl = a.firstLast[metric];
  const data = a.entries.map((e) => ({ day: dayLabel(e), v: e.fact[metric] }));
  const title = metric === 'screen' ? 'Экран уақыты қалай өзгерді?' : 'Кітап оқу қалай өзгерді?';
  return (
    <Card title={title} sub="Әр күн, минут">
      <div className="h-[220px]">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 22, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" {...axisProps} fontSize={11} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} trigger="click" />
            <Bar dataKey="v" name={METRIC_LABELS[metric]} fill={METRIC_COLORS[metric]} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="v" position="top" fontSize={12} fill="#17263C" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {fl ? (
        <div className="mt-3 space-y-2">
          <ResultMessage tone="info">
            {dayLabel(a.entries[0])}: {fl.first} мин → {dayLabel(a.entries[a.n - 1])}: {fl.last} мин. {fl.diff === 0 ? 'Өзгерген жоқ.' : `${Math.abs(fl.diff)} минутқа ${fl.diff < 0 ? 'азайды' : 'көбейді'}.`}
          </ResultMessage>
          <div className="rounded-2xl bg-soft px-4 py-2 font-mono text-[15px] leading-7">
            <div>
              Айырма: {fl.last} − {fl.first} = {fl.diff > 0 ? '+' : ''}
              {fl.diff} мин
            </div>
            <div>{fl.pct === null ? 'Пайызды есептеу мүмкін емес (бастапқы мән 0).' : `Пайыз: ${fl.diff > 0 ? '+' : fl.diff < 0 ? '−' : ''}${Math.abs(fl.diff)} / ${fl.first} × 100% = ${fmtPercent(fl.pct, 1, true)}`}</div>
          </div>
        </div>
      ) : (
        <ResultMessage tone="warn">Өзгерісті көру үшін кемінде 2 күн жаз.</ResultMessage>
      )}
    </Card>
  );
}

function PlanFact({ a }: { a: ReturnType<typeof computeAnalytics> }) {
  const byDay = a.entries
    .map((e) => {
      const rows = a.planFact.filter((r) => r.date === e.date);
      if (!rows.length) return null;
      return { day: dayLabel(e), plan: rows.reduce((s, r) => s + r.plan, 0), fact: rows.reduce((s, r) => s + r.fact, 0) };
    })
    .filter(Boolean) as Array<{ day: string; plan: number; fact: number }>;
  const avgDelta = byDay.reduce((s, r) => s + (r.fact - r.plan), 0) / byDay.length;
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-4 text-[15px]">
        <span className="flex items-center gap-2"><span className="size-3.5 rounded" style={{ background: PLAN_COLOR }} /> Жоспар</span>
        <span className="flex items-center gap-2"><span className="size-3.5 rounded" style={{ background: FACT_COLOR }} /> Нақты</span>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer>
          <BarChart data={byDay} margin={{ top: 22, right: 8, left: -14, bottom: 0 }} barGap={3}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" {...axisProps} fontSize={11} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} trigger="click" />
            <Bar dataKey="plan" name="Жоспар" fill={PLAN_COLOR} radius={[5, 5, 0, 0]}><LabelList dataKey="plan" position="top" fontSize={11} fill="#6B7A90" /></Bar>
            <Bar dataKey="fact" name="Нақты" fill={FACT_COLOR} radius={[5, 5, 0, 0]}><LabelList dataKey="fact" position="top" fontSize={11} fill="#17263C" /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ResultMessage tone="info">
        Орташа есеппен нақты күн жоспардан {Math.abs(Math.round(avgDelta * 10) / 10).toString().replace('.', ',')} минутқа {avgDelta > 0 ? 'көп' : avgDelta < 0 ? 'аз' : 'айырмашылықсыз'} болды (жоспар жазылған {byDay.length} күн бойынша).
      </ResultMessage>
    </>
  );
}
