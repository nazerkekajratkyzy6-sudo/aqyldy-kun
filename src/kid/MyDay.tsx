import { useState } from 'react';
import { RotateCcw, Plus, FilePlus2 } from 'lucide-react';
import { KidShell, ActivityCard, TimeStepper, ResultMessage, BigButton, SourceTag, KID_COLORS, minutesText } from './ui';
import { ArtMyDay } from './illustrations';
import { DayRing } from '../components/DayRing';
import { ACTIVITIES, ACTIVITY_IDS, changeSentence, dayFree, dayTotal, setActivity, type ActivityId } from '../core/kid';
import { useKidDay } from './state';
import { fmtNumber } from '../core/format';

export default function MyDay() {
  const { plan, example, setPlan, reset } = useKidDay();
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState<ActivityId>('reading');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'info'; text: string } | null>(null);
  const free = dayFree(plan);
  const total = dayTotal(plan);

  const change = (v: number) => {
    const before = plan[sel];
    const r = setActivity(plan, sel, v);
    setPlan(r.plan);
    setMsg({ tone: r.clamped && v > r.max ? 'warn' : 'info', text: changeSentence(sel, before, r.applied, v) });
  };

  const labels = {
    1: { label: 'Қандай іс жасайсың?', ins: 'Бір карточканы бас. Бос уақыт өзі есептеледі.' },
    2: { label: `${ACTIVITIES[sel].label}: қанша уақыт?`, ins: 'Плюс пен минус батырмаларын бас. Минуттар өзі қосылады.' },
    3: { label: 'Нәтижені көр!', ins: 'Шеңбер — сенің тәулігің. Барлығы 1440 минут.' },
  }[step as 1 | 2 | 3];

  return (
    <KidShell
      section="/my-day"
      title="Менің күнім"
      art={<ArtMyDay size={72} />}
      step={{ n: step, total: 3, label: labels.label }}
      instruction={labels.ins}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={step < 3 ? () => setStep(step + 1) : undefined}
      nextLabel={step === 1 ? 'Келесі' : step === 2 ? 'Нәтиже' : 'Тәжірибе'}
    >
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <SourceTag kind={example ? 'demo' : 'mine'} />
            {example && <span className="text-[15px] text-ink-3">Бұл — мысал күн. Өз уақыттарыңды қой немесе жаңадан баста.</span>}
            <span className="ml-auto flex gap-2">
              <BigButton variant="secondary" className="min-h-11 px-3 text-[15px]" icon={<RotateCcw size={17} />} onClick={() => { reset('example'); setMsg(null); }}>
                Мысал күн
              </BigButton>
              <BigButton variant="secondary" className="min-h-11 px-3 text-[15px]" icon={<FilePlus2 size={17} />} onClick={() => { reset('empty'); setMsg(null); }}>
                Жаңадан бастау
              </BigButton>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ACTIVITY_IDS.map((id) => (
              <ActivityCard
                key={id}
                id={id}
                minutes={plan[id]}
                selected={sel === id}
                onClick={() => {
                  setSel(id);
                  setMsg(null);
                  setStep(2);
                }}
              />
            ))}
            <ActivityCard id="free" minutes={free} sub="өзі есептеледі" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          <div className="mx-auto w-full max-w-[260px]">
            <ActivityCard id={sel} minutes={plan[sel]} selected />
            <div className="mt-3 rounded-2xl bg-soft px-4 py-3 text-center text-[15px]">
              Бос уақыт: <b className="font-mono text-teal">{minutesText(free)}</b>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <TimeStepper value={plan[sel]} onChange={change} max={plan[sel] + free} label={ACTIVITIES[sel].label} />
            {msg && <ResultMessage tone={msg.tone}>{msg.text}</ResultMessage>}
            {free === 0 && !msg && <ResultMessage tone="warn">Бос уақыт қалмады: тәулікте 1440 минуттан артық жоқ.</ResultMessage>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <DayRing
            segments={ACTIVITY_IDS.map((id) => ({ id, label: ACTIVITIES[id].label, minutes: plan[id], color: KID_COLORS[id] }))}
            size={360}
            remainderLabel="Бос уақыт"
            center={
              <>
                <div className="text-[15px] text-ink-3">Бос уақыт</div>
                <div className="font-display text-5xl font-semibold text-teal tnum">{fmtNumber(free, 0)}</div>
                <div className="text-sm text-ink-3">минут</div>
              </>
            }
          />
          <div className="flex flex-col gap-4">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[16px]">
              {ACTIVITY_IDS.map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => { setSel(id); setMsg(null); setStep(2); }} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-soft">
                    <span className="size-3.5 shrink-0 rounded" style={{ background: KID_COLORS[id] }} />
                    <span className="flex-1 truncate">{ACTIVITIES[id].label}</span>
                    <span className="font-mono tnum text-ink-2">{plan[id]}</span>
                  </button>
                </li>
              ))}
              <li className="flex items-center gap-2 px-2 py-1.5 font-semibold text-teal">
                <span className="size-3.5 shrink-0 rounded border-2 border-dashed border-teal" />
                <span className="flex-1">Бос уақыт</span>
                <span className="font-mono tnum">{free}</span>
              </li>
            </ul>
            <div className="rounded-2xl border-2 border-line bg-soft px-4 py-3 font-mono text-[16px] leading-8">
              <div className="break-words">
                Істер: {ACTIVITY_IDS.map((id) => plan[id]).filter((x) => x > 0).join(' + ') || '0'} = <b>{total}</b> мин
              </div>
              <div>
                Бос уақыт: 1440 − {total} = <b className="text-teal">{free}</b> мин
              </div>
              <div>
                Тексеру: {total} + {free} = <b className="text-brand">{total + free}</b> мин ✓
              </div>
            </div>
            {free === 0 ? (
              <ResultMessage tone="warn">Бос уақыт қалмады. Күтпеген іске біраз резерв қалдырған дұрыс.</ResultMessage>
            ) : (
              <ResultMessage tone="ok">Сенің күніңде {minutesText(free)} бос уақыт бар. Барлық істер 1440 минутқа сыяды.</ResultMessage>
            )}
            <BigButton variant="secondary" icon={<Plus size={18} />} onClick={() => setStep(1)}>
              Басқа іс таңдау
            </BigButton>
            <p className="text-sm text-ink-3">Жоспарың өзі сақталады (осы құрылғыда).</p>
          </div>
        </div>
      )}
    </KidShell>
  );
}
