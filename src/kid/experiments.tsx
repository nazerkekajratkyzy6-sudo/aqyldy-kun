import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, RotateCcw, Save, Play as PlayIcon, ArrowDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { KidShell, ActivityCard, TimeStepper, ResultMessage, BigButton, SourceTag, KID_COLORS, minutesText } from './ui';
import { ArtExperiment } from './illustrations';
import { DayRing } from '../components/DayRing';
import { ChartTooltip, axisProps, gridProps } from '../components/charts';
import { ACTIVITIES, ACTIVITY_IDS, COMPARE_METRICS, compareBalanced, dayFree, dayTotal, setActivity, transfer, valueOf, type ActivityId, type DayPlan, type WithFree } from '../core/kid';
import { useKidDay } from './state';
import { getAll, put, type ExperimentRecord } from '../store/db';
import { useAppData } from '../store/AppData';
import { cx } from '../components/ui';

const EXPS = [
  { n: 1, title: 'Уақыт қайда кетеді?', desc: '1440 минуттың қалай бөлінетінін зертте.' },
  { n: 2, title: '30 минутты өзгертсем не болады?', desc: 'Бір істен екінші іске минут ауыстыр.' },
  { n: 3, title: 'Қай жоспар тиімді?', desc: 'Екі жоспарды қатар салыстыр.' },
];

export function ExperimentsHub() {
  const { example } = useKidDay();
  return (
    <KidShell section="/experiments" title="Тәжірибе" art={<ArtExperiment size={72} />} instruction="Үш тәжірибенің бірін таңда. Әр тәжірибе 3 қадамнан тұрады.">
      <div className="mb-4">
        <SourceTag kind={example ? 'demo' : 'mine'} /> <span className="ml-2 text-[15px] text-ink-3">Тәжірибелер «Менің күнім» жоспарынан басталады.</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {EXPS.map((e) => (
          <Link key={e.n} to={`/experiments/${e.n}`} className="group flex flex-col rounded-3xl border-2 border-line bg-white p-6 hover:-translate-y-0.5 hover:border-teal hover:shadow-lg">
            <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 font-display text-2xl font-semibold text-teal">{e.n}</span>
            <span className="mt-4 font-display text-2xl font-semibold leading-tight">{e.title}</span>
            <span className="mt-2 text-[17px] text-ink-2">{e.desc}</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-5 font-semibold text-teal">
              Бастау <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </KidShell>
  );
}

export function ExperimentPage() {
  const { n } = useParams();
  const k = Number(n);
  if (k === 2) return <Exp2 />;
  if (k === 3) return <Exp3 />;
  return <Exp1 />;
}

function useSaved(n: number) {
  const [count, setCount] = useState(0);
  const reload = useCallback(async () => {
    const all = await getAll<ExperimentRecord>('experiments');
    setCount(all.filter((r) => r.experiment === 100 + n).length);
  }, [n]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { count, reload };
}

function ExpEnd({ n, onRedo, record }: { n: number; onRedo: () => void; record: () => Omit<ExperimentRecord, 'id' | 'experiment' | 'createdAt'> }) {
  const nav = useNavigate();
  const { toast } = useAppData();
  const { count, reload } = useSaved(n);
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <BigButton variant="secondary" icon={<RotateCcw size={19} />} onClick={onRedo}>
          Қайта жасау
        </BigButton>
        <BigButton
          variant="teal"
          icon={<Save size={19} />}
          onClick={async () => {
            await put('experiments', { ...record(), id: `kid${n}-${Date.now().toString(36)}`, experiment: 100 + n, createdAt: new Date().toISOString() });
            await reload();
            toast('Нәтиже сақталды');
          }}
        >
          Нәтижені сақтау
        </BigButton>
        <BigButton icon={<ArrowRight size={19} />} onClick={() => nav(n < 3 ? `/experiments/${n + 1}` : '/helper')}>
          {n < 3 ? 'Келесі тәжірибе' : 'Ақылды көмекшіге'}
        </BigButton>
      </div>
      {count > 0 && <p className="text-[15px] text-ink-3">Сақталған нәтижелер: {count}</p>}
    </div>
  );
}

function Compact({ ids, sel, onPick, plan, withFree }: { ids: WithFree[]; sel?: WithFree; onPick: (id: WithFree) => void; plan: DayPlan; withFree?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {[...ids, ...(withFree ? (['free'] as WithFree[]) : [])].map((id) => (
        <ActivityCard key={id} id={id} compact minutes={valueOf(plan, id)} selected={sel === id} onClick={() => onPick(id)} />
      ))}
    </div>
  );
}

function rings(plan: DayPlan) {
  return ACTIVITY_IDS.map((id) => ({ id, label: ACTIVITIES[id].label, minutes: plan[id], color: KID_COLORS[id] }));
}

/* ---------------- 1-тәжірибе ---------------- */
function Exp1() {
  const { plan: base, example } = useKidDay();
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState<ActivityId>('screen');
  const [plan, setPlan] = useState<DayPlan>(base);
  const [start, setStart] = useState<DayPlan>(base);
  useEffect(() => {
    setPlan(base);
    setStart(base);
  }, [base]);
  const oldV = start[sel];
  const newV = plan[sel];
  const d = newV - oldV;
  const freeOld = dayFree(start);
  const freeNew = dayFree(plan);
  const L = { 1: ['Қай істі өзгертесің?', 'Бір карточканы таңда.'], 2: [`${ACTIVITIES[sel].label}: уақытты өзгерт`, 'Плюс немесе минус бас. Шеңбер бірден өзгереді.'], 3: ['Не өзгерді?', 'Бастапқы мен жаңа мәнді салыстыр.'] }[step as 1 | 2 | 3];
  const redo = () => {
    setPlan(base);
    setStart(base);
    setStep(1);
  };
  const sentence = d === 0 ? `${ACTIVITIES[sel].label} өзгерген жоқ, сондықтан бос уақыт та өзгерген жоқ.` : d > 0 ? `${ACTIVITIES[sel].label} ${d} минутқа көбейді, сондықтан бос уақыт ${d} минутқа азайды.` : `${ACTIVITIES[sel].label} ${-d} минутқа азайды, сондықтан бос уақыт ${-d} минутқа көбейді.`;

  return (
    <KidShell section="/experiments" title="1-тәжірибе: Уақыт қайда кетеді?" art={<ArtExperiment size={72} />} step={{ n: step, total: 3, label: L[0] }} instruction={L[1]} onBack={step > 1 ? () => setStep(step - 1) : undefined} onNext={step < 3 ? () => setStep(step + 1) : () => setStep(1)} nextLabel={step < 3 ? 'Келесі' : 'Басынан'}>
      <div className="mb-4"><SourceTag kind={example ? 'demo' : 'mine'} /></div>
      {step === 1 && (
        <>
          <p className="mb-3 text-[17px] text-ink-2"><b>Мақсат:</b> 1440 минуттың істерге қалай бөлінетінін зерттеу.</p>
          <Compact ids={[...ACTIVITY_IDS]} sel={sel} plan={plan} onPick={(id) => { setSel(id as ActivityId); setStep(2); }} />
        </>
      )}
      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <DayRing segments={rings(plan)} size={320} remainderLabel="Бос уақыт" center={<><div className="text-sm text-ink-3">Бос уақыт</div><div className="font-display text-4xl font-semibold text-teal tnum">{freeNew}</div><div className="text-xs text-ink-3">минут</div></>} />
          <div className="flex flex-col gap-4">
            <TimeStepper value={newV} onChange={(v) => setPlan(setActivity(plan, sel, v).plan)} max={newV + freeNew} label={ACTIVITIES[sel].label} />
            <Numbers oldV={oldV} newV={newV} free={freeNew} />
          </div>
        </div>
      )}
      {step === 3 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center">
              <div className="mb-2 font-semibold text-ink-2">Бастапқы күн</div>
              <DayRing segments={rings(start)} size={260} showHours={false} remainderLabel="Бос уақыт" center={<div className="font-display text-3xl font-semibold text-teal tnum">{freeOld}</div>} />
            </div>
            <div className="text-center">
              <div className="mb-2 font-semibold text-ink-2">Жаңа күн</div>
              <DayRing segments={rings(plan)} size={260} showHours={false} remainderLabel="Бос уақыт" center={<div className="font-display text-3xl font-semibold text-teal tnum">{freeNew}</div>} />
            </div>
          </div>
          <div className="mt-4"><Numbers oldV={oldV} newV={newV} free={freeNew} /></div>
          <div className="mt-4 rounded-2xl border-2 border-line bg-soft px-4 py-3 font-mono text-[16px] leading-8">
            <div>Айырма: {newV} − {oldV} = <b>{d > 0 ? `+${d}` : d}</b> мин</div>
            <div>Бос уақыт: {freeOld} {d >= 0 ? '−' : '+'} {Math.abs(d)} = <b className="text-teal">{freeNew}</b> мин</div>
            <div>Барлығы: {dayTotal(plan)} + {freeNew} = <b className="text-brand">1440</b> мин</div>
          </div>
          <div className="mt-4"><ResultMessage tone="ok" big>{sentence}</ResultMessage></div>
          <ExpEnd n={1} onRedo={redo} record={() => ({ title: 'Уақыт қайда кетеді?', demo: example, params: { activity: sel, start: oldV, end: newV }, results: { diff: d, freeBefore: freeOld, freeAfter: freeNew }, conclusion: sentence })} />
        </>
      )}
    </KidShell>
  );
}

function Numbers({ oldV, newV, free }: { oldV: number; newV: number; free: number }) {
  const d = newV - oldV;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['Бастапқы', `${oldV}`, 'text-ink'],
        ['Жаңа', `${newV}`, 'text-brand'],
        ['Айырма', d > 0 ? `+${d}` : `${d}`, d > 0 ? 'text-amber-700' : d < 0 ? 'text-teal' : 'text-ink'],
        ['Бос уақыт', `${free}`, 'text-teal'],
      ].map(([l, v, c]) => (
        <div key={l} className="rounded-2xl border-2 border-line bg-white px-3 py-2.5 text-center">
          <div className="text-sm text-ink-3">{l}</div>
          <div className={cx('font-display text-3xl font-semibold tnum', c)}>{v}</div>
          <div className="text-xs text-ink-3">минут</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- 2-тәжірибе ---------------- */
function Exp2() {
  const { plan: base, example } = useKidDay();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(1);
  const [from, setFrom] = useState<WithFree>('screen');
  const [to, setTo] = useState<WithFree>('reading');
  const [amount, setAmount] = useState(30);
  const [replay, setReplay] = useState(0);
  const t = useMemo(() => transfer(base, from, to, amount), [base, from, to, amount]);
  const L = { 1: ['Қай істен минут аласың?', 'Минут азаятын істі таңда.'], 2: ['Қай іске бересің? Неше минут?', 'Минут көбейетін істі және санын таңда.'], 3: ['Не болды?', 'Екі кестені салыстыр. Минуттар қайда кетті?'] }[step as 1 | 2 | 3];
  const order: WithFree[] = [...ACTIVITY_IDS, 'free'];
  const pos = (p: DayPlan, id: WithFree) => {
    let acc = 0;
    for (const x of order) {
      const v = valueOf(p, x);
      if (x === id) return ((acc + v / 2) / 1440) * 100;
      acc += v;
    }
    return 50;
  };
  const sentence = t.moved === 0 ? 'Ешқандай минут ауысқан жоқ.' : `${cap(ACTIVITIES[from].abl)} ${t.moved} минут алып, ${ACTIVITIES[to].dat} бердік. ${ACTIVITIES[from].label} ${t.moved} минутқа азайды, ${ACTIVITIES[to].label.toLocaleLowerCase('kk-KZ')} ${t.moved} минутқа көбейді. Жалпы уақыт өзгерген жоқ: бұрын да, кейін де 1440 минут.`;

  return (
    <KidShell section="/experiments" title="2-тәжірибе: 30 минутты өзгертсем не болады?" art={<ArtExperiment size={72} />} step={{ n: step, total: 3, label: L[0] }} instruction={L[1]} onBack={step > 1 ? () => setStep(step - 1) : undefined} onNext={step < 3 ? () => setStep(step + 1) : () => setStep(1)} nextLabel={step < 3 ? 'Келесі' : 'Басынан'} nextDisabled={step === 2 && from === to}>
      <div className="mb-4"><SourceTag kind={example ? 'demo' : 'mine'} /></div>
      {step === 1 && (
        <>
          <p className="mb-3 text-[17px] text-ink-2"><b>Мақсат:</b> уақыт бір істен екінші іске ауысқанда не өзгеретінін зерттеу.</p>
          <Compact ids={[...ACTIVITY_IDS]} withFree sel={from} plan={base} onPick={(id) => { setFrom(id); if (id === to) setTo(id === 'reading' ? 'movement' : 'reading'); setStep(2); }} />
        </>
      )}
      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-2 font-semibold">Қай іске береміз?</div>
            <Compact ids={[...ACTIVITY_IDS].filter((x) => x !== from)} withFree={from !== 'free'} sel={to} plan={base} onPick={setTo} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="font-semibold">
              {ACTIVITIES[from].label} → {ACTIVITIES[to].label}
            </div>
            <TimeStepper value={Math.min(amount, valueOf(base, from))} onChange={setAmount} max={valueOf(base, from)} label="Ауыстырылатын минут" />
            {valueOf(base, from) === 0 && <ResultMessage tone="warn">«{ACTIVITIES[from].label}» ішінде минут жоқ — алатын уақыт жоқ.</ResultMessage>}
          </div>
        </div>
      )}
      {step === 3 && (
        <>
          <div className="rounded-3xl border-2 border-line bg-white p-4 sm:p-6">
            <div className="relative">
              <DayBar label="Бұрын" plan={t.before} />
              <div className="my-3 flex items-center justify-center text-ink-3"><ArrowDown size={22} /></div>
              <DayBar label="Кейін" plan={t.after} />
              {t.moved > 0 && (
                <motion.div
                  key={replay}
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-full bg-amber px-3 py-1 font-mono text-sm font-bold text-white shadow-lg"
                  initial={reduce ? false : { left: `${pos(t.before, from)}%`, top: 34, opacity: 0 }}
                  animate={{ left: [`${pos(t.before, from)}%`, `${pos(t.before, from)}%`, `${pos(t.after, to)}%`], top: [34, 34, 152], opacity: [0, 1, 1] }}
                  transition={{ duration: reduce ? 0 : 1.6, times: [0, 0.2, 1], ease: 'easeInOut' }}
                >
                  {t.moved} мин
                </motion.div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <BigButton variant="secondary" className="min-h-11 text-[15px]" icon={<PlayIcon size={16} />} onClick={() => setReplay((r) => r + 1)}>
                Қайта көрсету
              </BigButton>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label={`${ACTIVITIES[from].label} азайды`} value={`${t.fromBefore} → ${t.fromAfter}`} sub={`−${t.moved} мин`} tone="text-coral" />
            <Stat label={`${ACTIVITIES[to].label} көбейді`} value={`${t.toBefore} → ${t.toAfter}`} sub={`+${t.moved} мин`} tone="text-teal" />
            <Stat label="Жалпы уақыт" value={`${t.totalBefore} → ${t.totalAfter}`} sub={t.totalBefore === t.totalAfter ? 'өзгерген жоқ' : 'өзгерді'} tone="text-brand" />
          </div>
          <div className="mt-4 rounded-2xl border-2 border-line bg-soft px-4 py-3 font-mono text-[16px] leading-8">
            <div>{ACTIVITIES[from].label}: {t.fromBefore} − {t.moved} = {t.fromAfter}</div>
            <div>{ACTIVITIES[to].label}: {t.toBefore} + {t.moved} = {t.toAfter}</div>
            <div>Барлығы: −{t.moved} + {t.moved} = 0 → 1440 минут сақталды</div>
          </div>
          <div className="mt-4"><ResultMessage tone="ok" big>{sentence}</ResultMessage></div>
          <p className="mt-3 text-[16px] text-ink-2"><b>Ереже:</b> тәулікте әрқашан 1440 минут. Бір істен алынған минут жоғалмайды — ол басқа іске ауысады.</p>
          <ExpEnd n={2} onRedo={() => { setStep(1); setAmount(30); }} record={() => ({ title: '30 минутты өзгертсем не болады?', demo: example, params: { from, to, amount: t.requested }, results: { moved: t.moved, fromBefore: t.fromBefore, fromAfter: t.fromAfter, toBefore: t.toBefore, toAfter: t.toAfter, total: t.totalAfter }, conclusion: sentence })} />
        </>
      )}
    </KidShell>
  );
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('kk-KZ') + s.slice(1);

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="rounded-2xl border-2 border-line bg-white px-4 py-3">
      <div className="text-sm text-ink-3">{label}</div>
      <div className={cx('font-display text-3xl font-semibold tnum', tone)}>{value}</div>
      <div className="text-sm text-ink-2">{sub}</div>
    </div>
  );
}

export function DayBar({ label, plan }: { label: string; plan: DayPlan }) {
  const order: WithFree[] = [...ACTIVITY_IDS, 'free'];
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-ink-2">{label}</div>
      <div className="flex h-12 w-full gap-[2px] overflow-hidden rounded-xl bg-soft-2" role="img" aria-label={`${label}: ${order.map((id) => `${ACTIVITIES[id].label} ${valueOf(plan, id)} мин`).join(', ')}`}>
        {order.map((id) => {
          const v = valueOf(plan, id);
          return (
            <motion.div key={id} title={`${ACTIVITIES[id].label}: ${v} мин`} initial={false} animate={{ width: `${(v / 1440) * 100}%` }} transition={{ duration: 0.6 }} className="h-full" style={{ background: id === 'free' ? 'repeating-linear-gradient(135deg,#E2E8F0,#E2E8F0 6px,#fff 6px,#fff 9px)' : KID_COLORS[id] }} />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 3-тәжірибе ---------------- */
const EDIT: ActivityId[] = ['homework', 'reading', 'rest', 'screen', 'sleep', 'movement'];

function Exp3() {
  const { plan: base, example } = useKidDay();
  const [step, setStep] = useState(1);
  const initialB = (p: DayPlan) => transfer(p, 'screen', 'reading', 30).after;
  const [A, setA] = useState<DayPlan>(base);
  const [B, setB] = useState<DayPlan>(() => initialB(base));
  useEffect(() => {
    setA(base);
    setB(initialB(base));
  }, [base]);
  const v = compareBalanced(A, B);
  const data = COMPARE_METRICS.map((id) => ({ name: ACTIVITIES[id].label, A: valueOf(A, id), B: valueOf(B, id) }));
  const L = { 1: ['Екі жоспар жаса', 'Плюс пен минус арқылы А және Ә жоспарларын өзгерт.'], 2: ['Салыстыр', 'Бағанды бас — минуты көрінеді.'] }[step as 1 | 2];

  return (
    <KidShell section="/experiments" title="3-тәжірибе: Қай жоспар тиімді?" art={<ArtExperiment size={72} />} step={{ n: step, total: 2, label: L[0] }} instruction={L[1]} onBack={step > 1 ? () => setStep(1) : undefined} onNext={step < 2 ? () => setStep(2) : () => setStep(1)} nextLabel={step < 2 ? 'Салыстыру' : 'Басынан'}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><SourceTag kind={example ? 'demo' : 'mine'} /> <span className="text-[15px] text-ink-3">Ә жоспары басында: экраннан 30 минут кітапқа берілген.</span></div>
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { name: 'А жоспары', p: A, set: setA, c: 'border-line-2' },
            { name: 'Ә жоспары', p: B, set: setB, c: 'border-brand/40' },
          ].map((x) => (
            <div key={x.name} className={cx('rounded-3xl border-2 bg-white p-4', x.c)}>
              <div className="mb-2 font-display text-xl font-semibold">{x.name}</div>
              <ul className="divide-y divide-line">
                {EDIT.map((id) => (
                  <li key={id} className="flex items-center gap-2 py-2">
                    <span className="size-3.5 rounded" style={{ background: KID_COLORS[id] }} />
                    <span className="flex-1 text-[16px]">{ACTIVITIES[id].label}</span>
                    <button type="button" aria-label={`${x.name}: ${ACTIVITIES[id].label} 15 минут азайту`} onClick={() => x.set(setActivity(x.p, id, x.p[id] - 15).plan)} className="grid size-11 place-items-center rounded-xl border-2 border-line-2 text-xl font-semibold hover:border-coral">−</button>
                    <span className="w-20 text-center font-mono text-[16px] tnum">{x.p[id]} мин</span>
                    <button type="button" aria-label={`${x.name}: ${ACTIVITIES[id].label} 15 минут қосу`} onClick={() => x.set(setActivity(x.p, id, x.p[id] + 15).plan)} className="grid size-11 place-items-center rounded-xl border-2 border-brand/30 bg-brand-50 text-xl font-semibold text-brand hover:border-brand">+</button>
                  </li>
                ))}
                <li className="flex items-center gap-2 py-2 font-semibold text-teal">
                  <span className="size-3.5 rounded border-2 border-dashed border-teal" />
                  <span className="flex-1">Бос уақыт</span>
                  <span className="w-[8.5rem] text-right font-mono tnum">{dayFree(x.p)} мин</span>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <>
          <div className="rounded-3xl border-2 border-line bg-white p-4">
            <div className="mb-2 flex flex-wrap gap-4 text-[15px]">
              <span className="flex items-center gap-2"><span className="size-3.5 rounded bg-[#A3B1C2]" /> А жоспары</span>
              <span className="flex items-center gap-2"><span className="size-3.5 rounded bg-brand" /> Ә жоспары</span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 8, left: -12, bottom: 0 }} barGap={3}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" {...axisProps} interval={0} fontSize={12} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} trigger="click" />
                  <Bar dataKey="A" name="А жоспары" fill="#A3B1C2" radius={[5, 5, 0, 0]}><LabelList dataKey="A" position="top" fontSize={11} fill="#6B7A90" /></Bar>
                  <Bar dataKey="B" name="Ә жоспары" fill="#2563EB" radius={[5, 5, 0, 0]}><LabelList dataKey="B" position="top" fontSize={11} fill="#17263C" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-line">
            <table className="w-full text-[16px]">
              <thead className="bg-soft text-sm text-ink-3">
                <tr><th className="px-3 py-2 text-left">Іс</th><th className="px-3 py-2 text-right">А</th><th className="px-3 py-2 text-right">Ә</th><th className="px-3 py-2 text-right">Айырма (Ә − А)</th></tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map((id) => {
                  const a = valueOf(A, id);
                  const b = valueOf(B, id);
                  return (
                    <tr key={id} className="border-t border-line">
                      <td className="px-3 py-2">{ACTIVITIES[id].label}</td>
                      <td className="px-3 py-2 text-right font-mono tnum">{a}</td>
                      <td className="px-3 py-2 text-right font-mono tnum">{b}</td>
                      <td className={cx('px-3 py-2 text-right font-mono font-semibold tnum', b - a > 0 ? 'text-teal' : b - a < 0 ? 'text-coral' : 'text-ink-3')}>{b - a > 0 ? `+${b - a}` : b - a}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4"><ResultMessage tone={v.kind === 'mixed' ? 'warn' : 'ok'} big>{v.summary}</ResultMessage></div>
          <ul className="mt-3 space-y-1.5 text-[16px] text-ink-2">
            {v.reasons.slice(0, 8).map((r) => (
              <li key={r} className="flex gap-2"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal" />{r}</li>
            ))}
          </ul>
          <ExpEnd n={3} onRedo={() => { setA(base); setB(initialB(base)); setStep(1); }} record={() => ({ title: 'Қай жоспар тиімді?', demo: example, params: { A, B } as unknown as Record<string, unknown>, results: { verdict: v.kind, diffs: v.diffs }, conclusion: v.summary })} />
        </>
      )}
    </KidShell>
  );
}

export { minutesText };
