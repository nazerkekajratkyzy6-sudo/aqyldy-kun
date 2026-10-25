import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X, Minus, Plus, Search } from 'lucide-react';
import { Logo } from '../components/Layout';
import { Dial24 } from './clocks';
import { DayBar } from './experiments';
import { ResultMessage, SourceTag } from './ui';
import { ArtMyDay, ArtExperiment, ArtHelper, ArtResults, Reading, Screen } from './illustrations';
import { Timeline } from '../components/Timeline';
import { ChartTooltip, axisProps, gridProps } from '../components/charts';
import { ACTIVITIES, adviceFor, analyzeChildPlan, childItems, improveChildPlan, transfer } from '../core/kid';
import { METRIC_LABELS } from '../core/diary';
import { fmtPercent } from '../core/format';
import { KIND_COLORS, METRIC_COLORS } from '../lib/palette';
import { cautiousConclusion, computeAnalytics, dayLabel } from '../lib/analytics';
import { PROJECT, SAMPLE_DIARY } from '../data/research';
import { useAppData } from '../store/AppData';
import { useHelperPlan, useKidDay } from './state';
import { cx } from '../components/ui';
import type { PlanItem } from '../core/scheduler';

const tl = (items: PlanItem[], bad = new Set<string>()) => items.map((i) => ({ id: i.id, label: i.title, start: i.start, end: i.end, color: KIND_COLORS[i.kind], dashed: i.kind === 'reserve', muted: i.kind === 'break' || i.kind === 'reserve', danger: bad.has(i.taskId ?? '') }));

function S1() {
  const { author } = useAppData();
  return (
    <div className="grid h-full gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-2xl leading-relaxed text-ink-2 sm:text-3xl">{PROJECT.problem}</p>
        <div className="rounded-3xl border-2 border-brand/25 bg-brand-50 p-5 text-xl leading-relaxed sm:text-2xl">
          <b className="text-brand">Мақсатым:</b> {PROJECT.goal}
        </div>
        {author.student && <p className="text-lg text-ink-3">{author.student}, {author.grade} · Жетекші: {author.supervisor}</p>}
      </div>
      <div className="hidden justify-center lg:flex">
        <ArtMyDay size={260} />
      </div>
    </div>
  );
}

function S2() {
  const [h, setH] = useState(8);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
      <Dial24 minutes={h * 60} size={380} center={<div className="font-display text-4xl font-semibold tnum">{h * 60}</div>} />
      <div className="space-y-5">
        <div className="font-mono text-2xl leading-relaxed sm:text-3xl">
          <div>1 тәулік = 24 сағат</div>
          <div>24 × 60 = <b className="text-teal">1440</b> минут</div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setH((x) => Math.max(0, x - 1))} aria-label="1 сағат азайту" className="grid size-16 place-items-center rounded-2xl border-2 border-line-2"><Minus size={26} /></button>
          <div className="font-mono text-2xl">{h} сағат = <b className="text-brand">{h} × 60 = {h * 60}</b> мин</div>
          <button type="button" onClick={() => setH((x) => Math.min(24, x + 1))} aria-label="1 сағат қосу" className="grid size-16 place-items-center rounded-2xl border-2 border-line-2"><Plus size={26} /></button>
        </div>
        <ResultMessage big tone="info">Қалғаны: 1440 − {h * 60} = {1440 - h * 60} минут.</ResultMessage>
      </div>
    </div>
  );
}

function S3() {
  const { plan, example } = useKidDay();
  const [amount, setAmount] = useState(30);
  const t = transfer(plan, 'screen', 'reading', amount);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-2xl">
        <Screen size={56} /> <span>Экраннан</span>
        <button type="button" onClick={() => setAmount((x) => Math.max(0, x - 10))} aria-label="10 минут азайту" className="grid size-14 place-items-center rounded-2xl border-2 border-line-2"><Minus size={24} /></button>
        <b className="w-28 text-center font-mono text-4xl tnum">{t.moved}</b>
        <button type="button" onClick={() => setAmount((x) => Math.min(plan.screen, x + 10))} aria-label="10 минут қосу" className="grid size-14 place-items-center rounded-2xl border-2 border-line-2"><Plus size={24} /></button>
        <span>минутты кітапқа беремін</span> <Reading size={56} />
        <SourceTag kind={example ? 'demo' : 'mine'} />
      </div>
      <div className="rounded-3xl border-2 border-line bg-white p-5">
        <DayBar label="Бұрын" plan={t.before} />
        <div className="h-4" />
        <DayBar label="Кейін" plan={t.after} />
      </div>
      <div className="grid gap-3 font-mono text-xl sm:grid-cols-3 sm:text-2xl">
        <div className="rounded-2xl bg-soft p-4">Экран: {t.fromBefore} → <b className="text-coral">{t.fromAfter}</b></div>
        <div className="rounded-2xl bg-soft p-4">Кітап: {t.toBefore} → <b className="text-teal">{t.toAfter}</b></div>
        <div className="rounded-2xl bg-soft p-4">Барлығы: <b className="text-brand">{t.totalAfter}</b> мин</div>
      </div>
      <ResultMessage big tone="ok">Минуттар жоғалмайды: {t.moved} минут экраннан кітапқа ауысты, тәулік бәрібір 1440 минут.</ResultMessage>
    </div>
  );
}

function S4() {
  const { state } = useHelperPlan();
  const [checked, setChecked] = useState(false);
  const a = analyzeChildPlan(state.blocks, state.windowStart, state.windowEnd);
  const r = improveChildPlan(state.blocks, state.windowStart, state.windowEnd, state.settings);
  const bad = new Set(a.overlaps.flatMap((o) => [o.a, o.b]).concat(a.outside.map((o) => o.id)));
  const own = childItems(state.blocks);
  const from = Math.min(state.windowStart, ...own.map((i) => i.start));
  const to = Math.max(state.windowEnd, ...own.map((i) => i.end));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SourceTag kind={state.example ? 'demo' : 'mine'} />
        <span className="text-lg text-ink-3">Көмекші — алгоритм (ереже бойынша есептейді).</span>
      </div>
      <div>
        <div className="mb-1 text-xl font-semibold">Менің жоспарым</div>
        <Timeline label="Менің жоспарым" items={tl(own, bad)} from={from} to={to} tickEvery={30} height={40} />
      </div>
      {!checked ? (
        <button type="button" onClick={() => setChecked(true)} className="flex min-h-20 w-full max-w-md items-center justify-center gap-3 rounded-3xl bg-brand text-2xl font-semibold text-white shadow-lg">
          <Search size={28} /> Жоспарымды тексер
        </button>
      ) : (
        <>
          <div className="grid gap-2">
            {adviceFor(a, state.blocks).slice(0, 4).map((x) => (
              <ResultMessage key={x.text} tone={x.tone}>{x.text}</ResultMessage>
            ))}
          </div>
          {r.errors.length === 0 && (
            <div>
              <div className="mb-1 text-xl font-semibold">Көмекшінің ұсынысы</div>
              <Timeline label="Ұсыныс" items={tl(r.items)} from={from} to={to} tickEvery={30} height={40} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function S5() {
  const { realEntries } = useAppData();
  const [showSample, setShowSample] = useState(false);
  const entries = realEntries.length ? realEntries : showSample ? SAMPLE_DIARY : [];
  const a = useMemo(() => computeAnalytics(entries, 'firstLast'), [entries]);
  if (!entries.length)
    return (
      <div className="space-y-5">
        <ResultMessage big tone="warn">Нақты бақылау деректері әлі енгізілмеген. Сондықтан нақты нәтиже туралы қорытынды жасамаймын.</ResultMessage>
        <button type="button" onClick={() => setShowSample(true)} className="min-h-14 rounded-2xl border-2 border-line-2 px-5 text-lg font-semibold">Ғылыми жұмыстағы мысалды көрсету</button>
      </div>
    );
  return (
    <div className="space-y-4">
      <SourceTag kind={realEntries.length ? 'real' : 'demo'} />
      <div className="grid gap-5 lg:grid-cols-2">
        {(['screen', 'reading'] as const).map((m) => {
          const fl = a.firstLast[m];
          return (
            <div key={m} className="rounded-3xl border-2 border-line bg-white p-4">
              <div className="text-xl font-semibold">{METRIC_LABELS[m]}</div>
              <div className="h-[200px]">
                <ResponsiveContainer>
                  <BarChart data={a.entries.map((e) => ({ day: dayLabel(e), v: e.fact[m] }))} margin={{ top: 22, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<ChartTooltip />} trigger="click" cursor={{ fill: '#F6F9FC' }} />
                    <Bar dataKey="v" name={METRIC_LABELS[m]} fill={METRIC_COLORS[m]} radius={[6, 6, 0, 0]}><LabelList dataKey="v" position="top" fontSize={14} fill="#17263C" /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {fl ? <div className="font-mono text-xl">{fl.first} → {fl.last}: {fl.diff > 0 ? '+' : ''}{fl.diff} мин ({fmtPercent(fl.pct, 1, true)})</div> : <div className="text-lg text-ink-3">Кемінде 2 күн керек.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function S6() {
  const { realEntries } = useAppData();
  const real = realEntries.length > 0;
  const a = useMemo(() => computeAnalytics(real ? realEntries : SAMPLE_DIARY, 'firstLast'), [real, realEntries]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ul className="space-y-3 text-xl leading-relaxed">
        <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full bg-teal" />Уақытты минутпен есептесем, күнімнің құрылымын анық көремін: тәулікте 1440 минут.</li>
        <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full bg-teal" />Бір іске уақыт қоссам, басқа іске немесе бос уақытқа азаяды — жалпы уақыт өзгермейді.</li>
        <li className="flex gap-3"><span className="mt-3 size-2.5 shrink-0 rounded-full bg-teal" />Ақылды көмекші ұсыныс береді, ал мен оны математика арқылы тексеремін.</li>
      </ul>
      <div className="space-y-2">
        {cautiousConclusion(a, !real).slice(-2).map((c) => (
          <ResultMessage key={c} tone="info">{c}</ResultMessage>
        ))}
      </div>
    </div>
  );
}

export default function Show() {
  const [i, setI] = useState(0);
  const [fs, setFs] = useState(false);
  const slides: Array<{ title: string; kicker: string; art?: ReactNode; body: ReactNode }> = [
    { kicker: 'Менің зерттеуім', title: PROJECT.title, body: <S1 /> },
    { kicker: 'Бір тәулікте 1440 минут', title: 'Тәулік — 1440 минут', body: <S2 /> },
    { kicker: 'Мен тәжірибе жасаймын', title: 'Экраннан кітапқа минут ауыстырамын', art: <ArtExperiment size={64} />, body: <S3 /> },
    { kicker: 'Ақылды көмекші', title: 'Жоспарымды тексеремін және жақсартамын', art: <ArtHelper size={64} />, body: <S4 /> },
    { kicker: 'Менің нәтижем', title: 'Бақылау нәтижелері', art: <ArtResults size={64} />, body: <S5 /> },
    { kicker: 'Қорытынды', title: 'Мен не білдім?', body: <S6 /> },
  ];
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') setI(0);
      else if (e.key === 'End') setI(slides.length - 1);
      else if (e.key.toLowerCase() === 'f') toggleFs();
    };
    window.addEventListener('keydown', onKey);
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', h);
    };
  }, [go, slides.length]);
  const s = slides[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 sm:px-6">
        <Logo size={30} />
        <span className="hidden font-display text-sm font-bold tracking-[0.06em] sm:inline">Жобамды көрсетемін</span>
        <ol className="mx-auto flex items-center gap-2" aria-label="Кезеңдер">
          {slides.map((x, k) => (
            <li key={k}>
              <button type="button" onClick={() => setI(k)} aria-label={`${k + 1}. ${x.kicker}`} aria-current={k === i ? 'step' : undefined} className={cx('h-3 rounded-full transition-all', k === i ? 'w-10 bg-brand' : 'w-3 bg-line-2')} />
            </li>
          ))}
        </ol>
        <button type="button" onClick={toggleFs} className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-line-2 px-3 text-sm font-semibold" aria-label={fs ? 'Толық экраннан шығу' : 'Толық экран'}>
          {fs ? <Minimize size={18} /> : <Maximize size={18} />} <span className="hidden sm:inline">{fs ? 'Шығу' : 'Толық экран'}</span>
        </button>
        <Link to="/" className="grid size-10 place-items-center rounded-xl border-2 border-line-2" aria-label="Басты бетке">
          <X size={18} />
        </Link>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={i} className="absolute inset-0 overflow-auto" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-6 sm:px-10 sm:py-8">
              <div className="flex items-center gap-4">
                {s.art}
                <div>
                  <div className="text-base font-semibold uppercase tracking-[0.12em] text-brand">{i + 1}. {s.kicker}</div>
                  <h2 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-5xl">{s.title}</h2>
                </div>
              </div>
              <div className="mt-6 flex-1">{s.body}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="inline-flex h-16 items-center gap-2 rounded-2xl border-2 border-line-2 px-5 text-xl font-semibold disabled:opacity-35">
          <ChevronLeft size={24} /> Артқа
        </button>
        <span className="hidden font-mono text-lg text-ink-3 sm:block">{i + 1} / {slides.length}</span>
        {i < slides.length - 1 ? (
          <button type="button" onClick={() => go(1)} className="inline-flex h-16 items-center gap-2 rounded-2xl bg-brand px-7 text-xl font-semibold text-white">
            Келесі <ChevronRight size={24} />
          </button>
        ) : (
          <Link to="/" className="inline-flex h-16 items-center gap-2 rounded-2xl bg-teal px-7 text-xl font-semibold text-white">
            Аяқтау
          </Link>
        )}
      </div>
    </div>
  );
}

function toggleFs() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.().catch(() => {});
}

export { ACTIVITIES };
