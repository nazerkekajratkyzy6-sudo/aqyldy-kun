import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileDown, Loader2, Sigma, NotebookPen } from 'lucide-react';
import { Page } from '../components/Layout';
import { DayRing } from '../components/DayRing';
import { ChartFrame, ChartTooltip, DataTable, axisProps, gridProps } from '../components/charts';
import { Badge, Button, Callout, Card, CardHeader, DataBadge, Formula, SectionTitle, Segmented, cx } from '../components/ui';
import { METRICS, METRIC_LABELS, PLAN_METRICS, type Metric } from '../core/diary';
import { fmtNumber, fmtPercent, fmtSigned } from '../core/format';
import { C, FACT_COLOR, METRIC_COLORS, PLAN_COLOR } from '../lib/palette';
import { METHOD_LABELS, cautiousConclusion, computeAnalytics, type CompareMethod } from '../lib/analytics';
import { useAppData } from '../store/AppData';

type DayFilter = 'all' | 'school' | 'weekend';

export default function Analytics() {
  const { entries: all, mode, setMode, author, toast } = useAppData();
  const [filter, setFilter] = useState<DayFilter>('all');
  const [method, setMethod] = useState<CompareMethod>('firstLast');
  const [pfMetric, setPfMetric] = useState<(typeof PLAN_METRICS)[number]>('screen');
  const [hidden, setHidden] = useState<Set<Metric>>(new Set());
  const [busy, setBusy] = useState(false);
  const entries = useMemo(() => (filter === 'all' ? all : all.filter((e) => e.dayType === filter)), [all, filter]);
  const a = useMemo(() => computeAnalytics(entries, method), [entries, method]);
  const demo = mode === 'sample';
  const conclusions = cautiousConclusion(a, demo);
  const pf = a.planFact.filter((r) => r.metric === pfMetric);

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { buildReport } = await import('../lib/pdf');
      await buildReport({ analytics: a, demo, author, filter, conclusions });
      toast('PDF есеп жүктелді');
    } catch (e) {
      console.warn(e);
      toast('PDF жасау мүмкін болмады', 'error');
    } finally {
      setBusy(false);
    }
  };

  const avgTotal = METRICS.reduce((s, m) => s + (a.avg[m] ?? 0), 0);

  return (
    <Page>
      <SectionTitle eyebrow="Талдау және есептер" title="Нәтижелерді талдау" lead="Графиктер мен есептер таңдалған дерек көзі бойынша автоматты түрде құрылады. Формулалар нақты сандармен көрсетіледі. Дерек жоқ болса, ешқандай тұжырым жасалмайды." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Дерек көзі" value={mode} onChange={setMode} options={[{ value: 'sample', label: 'Үлгі деректер' }, { value: 'real', label: 'Нақты зерттеу' }]} />
        <Segmented label="Күн түрі" value={filter} onChange={setFilter} size="sm" options={[{ value: 'all', label: 'Барлығы' }, { value: 'school', label: 'Оқу күндері' }, { value: 'weekend', label: 'Демалыс күндері' }]} />
        <DataBadge kind={demo ? 'demo' : 'real'} />
        <Button variant="primary" className="ml-auto" onClick={exportPdf} disabled={busy}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <FileDown size={17} />} PDF есеп
        </Button>
      </div>

      {a.n === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-semibold">Деректер жоқ</p>
          <p className="mx-auto mt-2 max-w-lg text-ink-2">{mode === 'real' ? 'Нақты бақылау жазбалары әлі енгізілмеген (немесе сүзгіге сай күн жоқ). Сондықтан жақсару немесе нашарлау туралы ешқандай тұжырым жасалмайды.' : 'Сүзгіге сай күн жоқ.'}</p>
          <Link to="/teacher/diary" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white">
            <NotebookPen size={17} /> Күнделікке өту
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card className="p-5">
              <h3 className="mb-1 font-display text-lg font-semibold">Орташа күн: өлшенген әрекеттер</h3>
              <p className="mb-4 text-sm text-ink-3">1440 минуттың ішіндегі орташа үлес ({a.n} күн)</p>
              <DayRing
                segments={METRICS.map((m) => ({ id: m, label: METRIC_LABELS[m], minutes: Math.round(a.avg[m] ?? 0), color: METRIC_COLORS[m] }))}
                size={280}
                remainderLabel="Өлшенбеген уақыт (ұйқы, мектеп т.б.)"
                center={
                  <>
                    <div className="text-xs text-ink-3">өлшенген</div>
                    <div className="font-display text-3xl font-semibold tnum">{fmtNumber(avgTotal, 0)}</div>
                    <div className="text-xs text-ink-3">мин / 1440</div>
                  </>
                }
              />
            </Card>
            <Card className="p-5">
              <ChartFrame
                title="Санаттар бойынша орташа мән M, мин"
                table={{ head: ['Көрсеткіш', 'M, мин', 'n'], rows: METRICS.map((m) => [METRIC_LABELS[m], a.avg[m] === null ? '—' : fmtNumber(a.avg[m]!), a.n]) }}
                height={240}
              >
                <ResponsiveContainer>
                  <BarChart data={METRICS.map((m) => ({ name: METRIC_LABELS[m], v: a.avg[m] === null ? 0 : Math.round(a.avg[m]! * 10) / 10, id: m }))} margin={{ top: 16, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...axisProps} interval={0} fontSize={11} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                    <Bar dataKey="v" name="Орташа" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: C.ink, fontSize: 12, formatter: (v: number) => fmtNumber(v) }}>
                      {METRICS.map((m) => (
                        <Cell key={m} fill={METRIC_COLORS[m]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {METRICS.slice(0, 2).map((m) => (
                  <Formula key={m} label={`M (${METRIC_LABELS[m]})`}>
                    ({a.entries.map((e) => e.fact[m]).join(' + ')}) / {a.n} = {fmtNumber(a.avg[m] ?? 0)}
                  </Formula>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <ChartFrame
              title="Күндер бойынша өзгеріс, мин"
              legend={METRICS.map((m) => ({ color: METRIC_COLORS[m], label: METRIC_LABELS[m] }))}
              table={{ head: ['Күн', ...METRICS.map((m) => METRIC_LABELS[m])], rows: a.byDay.map((d) => [String(d.day), ...METRICS.map((m) => d[m] as number)]) }}
              height={300}
              actions={
                <div className="hidden flex-wrap gap-1 md:flex">
                  {METRICS.map((m) => (
                    <button key={m} type="button" aria-pressed={!hidden.has(m)} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(m)) n.delete(m); else n.add(m); return n; })} className={cx('rounded-md border px-2 py-0.5 text-xs', hidden.has(m) ? 'border-line text-ink-3 line-through' : 'border-line-2 text-ink-2')}>
                      {METRIC_LABELS[m]}
                    </button>
                  ))}
                </div>
              }
            >
              <ResponsiveContainer>
                <LineChart data={a.byDay} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.grid, strokeWidth: 1 }} />
                  {METRICS.filter((m) => !hidden.has(m)).map((m) => (
                    <Line key={m} type="monotone" dataKey={m} name={METRIC_LABELS[m]} stroke={METRIC_COLORS[m]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Card>

          <Card>
            <CardHeader title="Жоспар және факт" subtitle="Δ = факт − жоспар (жоспар енгізілген күндер ғана)" icon={<Sigma size={18} />} actions={<Segmented size="sm" label="Көрсеткіш" value={pfMetric} onChange={setPfMetric} options={PLAN_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] }))} />} />
            <div className="p-5">
              {a.planFact.length === 0 ? (
                <Callout tone="info">
                  {demo ? (
                    <>
                      Зерттеу жұмысының 5 күндік үлгі кестесінде жоспар бағаны жоқ. Жоспар/факт салыстыруы 2.2-кесте бойынша <Link className="font-semibold text-brand underline" to="/teacher/experiments?e=3">3-экспериментте</Link> көрсетілген.
                    </>
                  ) : (
                    'Күнделікте жоспар мәндері енгізілмеген. Жоспар/факт талдауы үшін әр күннің «жоспар» өрістерін толтырыңыз.'
                  )}
                </Callout>
              ) : pf.length === 0 ? (
                <p className="text-sm text-ink-3">Бұл көрсеткіш үшін жоспар енгізілмеген.</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <ChartFrame
                    title={`${METRIC_LABELS[pfMetric]}: жоспар мен факт`}
                    legend={[
                      { color: PLAN_COLOR, label: 'Жоспар' },
                      { color: FACT_COLOR, label: 'Факт' },
                    ]}
                    table={{ head: ['Күн', 'Жоспар', 'Факт', 'Δ'], rows: pf.map((r) => [r.date, r.plan, r.fact, fmtSigned(r.delta, 0)]) }}
                    height={250}
                  >
                    <ResponsiveContainer>
                      <BarChart data={pf.map((r) => ({ ...r, day: a.byDay[a.entries.findIndex((e) => e.date === r.date)]?.day }))} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={2}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="day" {...axisProps} />
                        <YAxis {...axisProps} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                        <Bar dataKey="plan" name="Жоспар" fill={PLAN_COLOR} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fact" name="Факт" fill={FACT_COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                  <div className="space-y-2">
                    {pf.slice(-6).map((r) => (
                      <Formula key={r.date}>
                        {r.date}: Δ = {r.fact} − {r.plan} = <b>{fmtSigned(r.delta, 0)}</b> мин
                      </Formula>
                    ))}
                    <Formula label="Орташа Δ">
                      ({pf.map((r) => r.delta).join(' + ')}) / {pf.length} = {fmtSigned(pf.reduce((s, r) => s + r.delta, 0) / pf.length)} мин
                    </Formula>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Екі кезеңді салыстыру" subtitle="P = (B − A) / A × 100%, A ≠ 0" actions={<Segmented size="sm" label="Салыстыру әдісі" value={method} onChange={setMethod} options={(Object.keys(METHOD_LABELS) as CompareMethod[]).map((k) => ({ value: k, label: METHOD_LABELS[k] }))} />} />
            <div className="p-5">
              {!a.compare.available ? (
                <Callout tone="warn" title="Салыстыру жүргізілмеді">
                  {a.compare.reason} Дерек жеткіліксіз болғандықтан, өзгеріс туралы тұжырым жасалмайды.
                </Callout>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  <div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <DataTable
                        head={['Көрсеткіш', `A: ${a.compare.labelA}`, `B: ${a.compare.labelB}`, 'B − A', 'P']}
                        rows={METRICS.map((m) => {
                          const c = a.compare.byMetric[m];
                          return [METRIC_LABELS[m], c.meanA === null ? '—' : fmtNumber(c.meanA), c.meanB === null ? '—' : fmtNumber(c.meanB), c.diff === null ? '—' : fmtSigned(c.diff), fmtPercent(c.pct, 1, true)];
                        })}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-3">
                      <Badge>nA = {a.compare.byMetric.screen.nA}</Badge>
                      <Badge>nB = {a.compare.byMetric.screen.nB}</Badge>
                      {a.mixed && <Badge tone="warn">Оқу және демалыс күндері араласқан</Badge>}
                    </div>
                    {(() => {
                      const c = a.compare.byMetric.screen;
                      return c.meanA !== null && c.meanB !== null ? (
                        <Formula className="mt-3" label="Мысал: экран">
                          P = ({fmtNumber(c.meanB)} − {fmtNumber(c.meanA)}) / {fmtNumber(c.meanA)} × 100% = {fmtPercent(c.pct, 1, true)}
                        </Formula>
                      ) : null;
                    })()}
                  </div>
                  <ChartFrame title="Пайыздық өзгеріс P, %" table={{ head: ['Көрсеткіш', 'P'], rows: METRICS.map((m) => [METRIC_LABELS[m], fmtPercent(a.compare.byMetric[m].pct, 1, true)]) }} height={230} note="Пайыз A = 0 болғанда есептелмейді.">
                    <ResponsiveContainer>
                      <BarChart data={METRICS.map((m) => ({ name: METRIC_LABELS[m], v: a.compare.byMetric[m].pct === null ? 0 : Math.round(a.compare.byMetric[m].pct! * 10) / 10, id: m }))} layout="vertical" margin={{ top: 4, right: 16, left: 22, bottom: 0 }}>
                        <CartesianGrid stroke="#EEF3F9" horizontal={false} />
                        <XAxis type="number" {...axisProps} unit="%" />
                        <YAxis type="category" dataKey="name" {...axisProps} width={100} fontSize={11} />
                        <ReferenceLine x={0} stroke={C.axis} />
                        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: '#F6F9FC' }} />
                        <Bar dataKey="v" name="P" radius={4}>
                          {METRICS.map((m) => (
                            <Cell key={m} fill={METRIC_COLORS[m]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">Сақ қорытынды</h3>
            <ul className="space-y-2 text-[15px] leading-relaxed">
              {conclusions.map((c, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </Page>
  );
}
