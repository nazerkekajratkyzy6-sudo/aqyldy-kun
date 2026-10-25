import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react';
import { Logo } from '../components/Layout';
import { HourGrid } from '../components/HourGrid';
import { DayRing } from '../components/DayRing';
import { AssistantWorkbench } from '../components/AssistantWorkbench';
import { ChartTooltip, DataTable, axisProps, gridProps } from '../components/charts';
import { DataBadge, Formula, Slider, Stat, cx } from '../components/ui';
import { EXAMPLE_ACTIVITIES } from './Lab1440';
import { setActivityMinutes, summarize } from '../core/budget';
import { screenRemainder, screenSeries } from '../core/experiments';
import { METRICS, METRIC_LABELS } from '../core/diary';
import { fmtNumber, fmtPercent, fmtSigned } from '../core/format';
import { C, METRIC_COLORS } from '../lib/palette';
import { computeAnalytics, cautiousConclusion, dayLabel } from '../lib/analytics';
import { PROJECT } from '../data/research';
import { useAppData } from '../store/AppData';

function Slide({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-5 py-6 sm:px-10 sm:py-8">
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-brand sm:text-base">{kicker}</div>
      <h2 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      <div className="mt-6 min-h-0 flex-1 overflow-auto pb-4">{children}</div>
    </div>
  );
}

function SimulationSlide() {
  const [list, setList] = useState(EXAMPLE_ACTIVITIES);
  const s = summarize(list);
  return (
    <div className="grid h-full gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
      <DayRing segments={list.map((a) => ({ id: a.id, label: a.name, minutes: a.minutes, color: a.color }))} size={380} center={<><div className="text-base text-ink-3">R</div><div className="font-display text-5xl font-semibold text-teal tnum">{fmtNumber(s.remainder, 0)}</div><div className="text-sm text-ink-3">мин қалды</div></>} />
      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id}>
            <div className="flex justify-between text-lg">
              <span className="flex items-center gap-2"><span className="size-3.5 rounded-[4px]" style={{ background: a.color }} />{a.name}</span>
              <span className="font-mono tnum">{a.minutes} мин</span>
            </div>
            <Slider value={a.minutes} max={1440} step={10} color={a.color} label={a.name} onChange={(v) => setList(setActivityMinutes(list, a.id, v).list as typeof list)} />
          </div>
        ))}
        <Formula className="text-lg">R = 1440 − {s.total} = {s.remainder} мин</Formula>
        <DataBadge kind="demo" />
      </div>
    </div>
  );
}

function ExperimentSlide() {
  const [screen, setScreen] = useState(60);
  const tasks = [60, 20, 30];
  const r = screenRemainder(180, tasks, screen);
  const series = useMemo(() => screenSeries(180, tasks, 10), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="h-[340px]">
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="screen" type="number" domain={[0, 180]} {...axisProps} unit=" мин" />
            <YAxis {...axisProps} />
            <ReferenceLine y={0} stroke={C.axis} />
            <Tooltip content={<ChartTooltip labelFormatter={(l) => `Экран: ${l} мин`} />} />
            <Line dataKey="remainder" name="Қалған R" stroke={C.teal} strokeWidth={3} dot={false} />
            <ReferenceDot x={screen} y={r.remainder} r={8} fill={r.remainder < 0 ? C.rose : C.teal} stroke="#fff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4 text-lg">
        <p className="text-ink-2">16:00–19:00 (180 мин): үй тапсырмасы 60, кітап 20, қозғалыс 30 мин. Экран уақыты S өзгергенде не болады?</p>
        <div>
          <div className="mb-1 flex justify-between"><span>Экран S</span><span className="font-mono">{screen} мин</span></div>
          <Slider value={screen} max={180} step={5} color={C.rose} label="Экран уақыты" onChange={setScreen} />
        </div>
        <Formula className="text-lg">R = 180 − 110 − {screen} = <b className={r.remainder < 0 ? 'text-danger' : 'text-teal'}>{r.remainder}</b> мин</Formula>
        <p className="text-ink-2">{r.remainder >= 0 ? `Экранға ең көбі ${r.maxScreen} мин бөлуге болады.` : `Уақыт ${r.deficit} минутқа жетпейді.`}</p>
        <DataBadge kind="demo" />
      </div>
    </div>
  );
}

export default function Defense() {
  const { author, realEntries, entries, mode } = useAppData();
  const [i, setI] = useState(0);
  const [fs, setFs] = useState(false);
  const real = useMemo(() => computeAnalytics(realEntries, realEntries.some((e) => e.phase === 'assistant') && realEntries.some((e) => e.phase === 'self') ? 'phase' : 'firstLast'), [realEntries]);
  const current = useMemo(() => computeAnalytics(entries, 'firstLast'), [entries]);
  const demo = mode === 'sample';

  const slides: Array<{ kicker: string; title: string; body: ReactNode }> = [
    {
      kicker: 'Мәселе',
      title: PROJECT.title,
      body: (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-2xl leading-relaxed text-ink-2 sm:text-3xl">{PROJECT.problem}</p>
            <p className="text-xl text-ink-3">{PROJECT.fullTitle}</p>
            {author.student && <p className="text-lg text-ink-2">{author.student}, {author.grade} · Ғылыми жетекші: {author.supervisor}</p>}
          </div>
          <div className="rounded-3xl border border-line bg-soft p-8 text-center">
            <div className="font-display text-7xl font-semibold text-brand tnum sm:text-8xl">1440</div>
            <div className="mt-2 text-2xl text-ink-2">минут тәулікте</div>
            <div className="mt-4 font-mono text-xl text-ink-3">24 × 60 = 1440</div>
          </div>
        </div>
      ),
    },
    {
      kicker: 'Мақсат',
      title: 'Мақсат, сұрақ, болжам',
      body: (
        <div className="grid gap-5 text-xl leading-relaxed sm:text-2xl lg:grid-cols-3">
          {[['Мақсат', PROJECT.goal], ['Зерттеу сұрағы', PROJECT.question], ['Болжам', PROJECT.hypothesis]].map(([h, t]) => (
            <div key={h} className="rounded-3xl border border-line p-6">
              <div className="mb-2 text-base font-semibold uppercase tracking-wide text-brand">{h}</div>
              <p className="text-ink-2">{t}</p>
            </div>
          ))}
        </div>
      ),
    },
    { kicker: '1440 минут', title: '24 × 60 = 1440: әр нүкте — бір минут', body: <HourGrid initial={300} /> },
    { kicker: 'Симуляция', title: 'Тәулікті бөлу: R = 1440 − ΣTᵢ', body: <SimulationSlide /> },
    { kicker: 'Эксперимент', title: 'Экран уақыты және қалған уақыт', body: <ExperimentSlide /> },
    { kicker: 'ЖИ-жоспарлау', title: 'Алгоритмдік көмекші: дейін / кейін / тексеру', body: <AssistantWorkbench storageKey="defense.assistant" compact /> },
    {
      kicker: 'Нақты бақылау',
      title: 'Оқушының күнделігі',
      body:
        real.n === 0 ? (
          <div className="rounded-3xl border border-amber/40 bg-amber-50 p-8 text-2xl leading-relaxed">
            Нақты бақылау деректері әлі енгізілмеген. Сондықтан нақты нәтиже туралы тұжырым жасалмайды. Деректерді «Зерттеу күнделігі» бөлімінде енгізіңіз.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xl">
              <DataBadge kind="real" /> <span>{real.n} күн жазылды</span>
            </div>
            <div className="overflow-auto rounded-2xl border border-line text-base">
              <DataTable head={['Күн', ...METRICS.map((m) => METRIC_LABELS[m])]} rows={real.entries.map((e) => [dayLabel(e), ...METRICS.map((m) => e.fact[m])])} />
            </div>
          </div>
        ),
    },
    {
      kicker: 'Талдау',
      title: 'Орташа мән және өзгеріс',
      body: (
        <div className="space-y-4">
          <DataBadge kind={demo ? 'demo' : 'real'} />
          {current.n === 0 ? (
            <p className="text-2xl text-ink-2">Деректер жоқ — талдау жасалмайды.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <BarChart data={METRICS.map((m) => ({ name: METRIC_LABELS[m], v: Math.round((current.avg[m] ?? 0) * 10) / 10 }))} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" {...axisProps} interval={0} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                    <Bar dataKey="v" name="M" radius={[5, 5, 0, 0]} label={{ position: 'top', fill: C.ink, fontSize: 14 }}>
                      {METRICS.map((m) => <Cell key={m} fill={METRIC_COLORS[m]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid content-start gap-3 sm:grid-cols-2">
                {(['screen', 'reading', 'unplanned'] as const).map((m) => {
                  const c = current.firstLast[m];
                  return c ? (
                    <Stat key={m} big label={`${METRIC_LABELS[m]}: ${dayLabel(current.entries[0])} → ${dayLabel(current.entries[current.n - 1])}`} value={c.diff} unit="мин" tone={c.diff < 0 ? 'brand' : 'amber'} hint={`${c.first} → ${c.last}; P = ${fmtPercent(c.pct, 1, true)}`} />
                  ) : null;
                })}
                <Formula className="sm:col-span-2 text-lg">P = (B − A) / A × 100%;  M = Σxᵢ / n</Formula>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      kicker: 'Қорытынды',
      title: 'Қорытынды және ұсыныстар',
      body: (
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="space-y-3 text-xl leading-relaxed">
            {cautiousConclusion(real.n ? real : current, real.n ? false : demo).map((c, k) => (
              <li key={k} className="flex gap-3"><span className="mt-3 size-2 shrink-0 rounded-full bg-teal" />{c}</li>
            ))}
          </ul>
          <div className="rounded-3xl border border-line bg-soft p-6">
            <div className="mb-2 text-base font-semibold uppercase tracking-wide text-brand">Ұсыныстар</div>
            <ul className="space-y-2 text-lg text-ink-2">
              {PROJECT.recommendations.map((r) => <li key={r}>• {r}</li>)}
            </ul>
            {real.n > 0 && real.compare.available && (
              <p className="mt-4 text-base text-ink-3">Нақты деректер бойынша экран: {fmtSigned(real.compare.byMetric.screen.diff ?? 0)} мин ({real.compare.labelA} ↔ {real.compare.labelB}).</p>
            )}
          </div>
        </div>
      ),
    },
  ];

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') setI(0);
      else if (e.key === 'End') setI(slides.length - 1);
      else if (e.key.toLowerCase() === 'f') toggleFs();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, slides.length]);

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const s = slides[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 sm:px-6">
        <Logo size={30} />
        <span className="hidden font-display text-sm font-bold tracking-[0.06em] sm:inline">AQYLDY KÜN · Жобаны қорғау</span>
        <ol className="mx-auto flex items-center gap-1.5" aria-label="Слайдтар">
          {slides.map((x, k) => (
            <li key={k}>
              <button type="button" onClick={() => setI(k)} aria-label={`${k + 1}. ${x.kicker}`} aria-current={k === i ? 'step' : undefined} className={cx('h-2.5 rounded-full transition-all', k === i ? 'w-8 bg-brand' : 'w-2.5 bg-line-2 hover:bg-ink-3')} />
            </li>
          ))}
        </ol>
        <button type="button" onClick={toggleFs} className="grid size-9 place-items-center rounded-lg border border-line-2" aria-label={fs ? 'Толық экраннан шығу' : 'Толық экран (F)'}>
          {fs ? <Minimize size={17} /> : <Maximize size={17} />}
        </button>
        <Link to="/teacher" className="grid size-9 place-items-center rounded-lg border border-line-2" aria-label="Қорғау режимінен шығу">
          <X size={17} />
        </Link>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <Slide kicker={`${i + 1} / ${slides.length} · ${s.kicker}`} title={s.title}>
              {s.body}
            </Slide>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-6">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-2 px-4 text-lg font-medium disabled:opacity-35">
          <ChevronLeft size={20} /> Артқа
        </button>
        <span className="hidden text-sm text-ink-3 sm:block">← → немесе Бос орын · F — толық экран</span>
        <button type="button" onClick={() => go(1)} disabled={i === slides.length - 1} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-lg font-semibold text-white disabled:opacity-35">
          Келесі <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

function toggleFs() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.().catch(() => {});
}
