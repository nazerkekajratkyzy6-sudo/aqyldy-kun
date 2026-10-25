import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, Minus, Plus, Trash2, Search, CheckCircle2, XCircle, Bot, Loader2, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { KidShell, ResultMessage, BigButton, SourceTag, KID_COLORS } from './ui';
import { ArtHelper, ACTIVITY_ART, ACTIVITY_TINT } from './illustrations';
import { Timeline } from '../components/Timeline';
import { ACTIVITIES, ACTIVITY_IDS, adviceFor, analyzeChildPlan, childItems, explainChanges, improveChildPlan, toSchedulerInput, type ActivityId, type ChildBlock } from '../core/kid';
import { verifySchedule, type PlanItem } from '../core/scheduler';
import { formatHM } from '../core/time';
import { uid } from '../core/format';
import { KIND_COLORS } from '../lib/palette';
import { askExplanation } from '../lib/llm';
import { exampleHelper, useHelperPlan } from './state';
import { useAppData } from '../store/AppData';
import { cx } from '../components/ui';

const CHECK_LABELS: Record<string, string> = {
  sum: 'Барлық уақыт дұрыс қосылды',
  overlap: 'Екі іс бір уақытта емес',
  window: 'Бәрі уақытқа сыяды',
  fixed: 'Міндетті істер орнында',
  reserve: 'Бос уақыт (резерв) қалды',
  tasks: 'Әр іс толық есептелді',
};

function timelineFrom(items: PlanItem[], bad = new Set<string>()) {
  return items.map((i) => ({ id: i.id, label: i.title, start: i.start, end: i.end, color: i.taskId && i.kind !== 'break' && i.kind !== 'reserve' ? KIND_COLORS[i.kind] : KIND_COLORS[i.kind], dashed: i.kind === 'reserve', muted: i.kind === 'break' || i.kind === 'reserve', danger: bad.has(i.taskId ?? '') }));
}

export default function Helper() {
  const { state, save } = useHelperPlan();
  const { toast } = useAppData();
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [adult, setAdult] = useState(false);
  const [llm, setLlm] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });
  const abort = useRef<AbortController | null>(null);
  const { windowStart: ws, windowEnd: we, blocks, settings } = state;

  const set = (patch: Partial<typeof state>) => {
    save({ ...state, ...patch, example: false });
    setChecked(false);
  };
  const upd = (id: string, p: Partial<ChildBlock>) => set({ blocks: blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });

  const analysis = useMemo(() => analyzeChildPlan(blocks, ws, we), [blocks, ws, we]);
  const advice = adviceFor(analysis, blocks);
  const result = useMemo(() => improveChildPlan(blocks, ws, we, settings), [blocks, ws, we, settings]);
  const input = toSchedulerInput(blocks, ws, we, settings);
  const checks = result.errors.length ? [] : verifySchedule(result, input);
  const changes = result.errors.length ? [] : explainChanges(blocks, analysis, result);
  const bad = new Set(analysis.overlaps.flatMap((o) => [o.a, o.b]).concat(analysis.outside.map((o) => o.id)));
  const own = childItems(blocks);
  const from = Math.min(ws, ...own.map((i) => i.start));
  const to = Math.max(we, ...own.map((i) => i.end));

  const L = {
    1: ['Менің жоспарым', 'Әр істің басталу уақыты мен ұзақтығын қой. Құлыпты бассаң — іс міндетті болады.'],
    2: ['Жоспарымды тексер', 'Үлкен батырманы бас — көмекші жоспарыңды тексереді.'],
    3: ['Жақсартылған жоспар', 'Екі жоспарды салыстыр. Ұнаса — қабылда.'],
  }[step as 1 | 2 | 3];

  const accept = () => {
    const nb: ChildBlock[] = result.items
      .filter((i) => i.taskId && i.kind !== 'break' && i.kind !== 'reserve')
      .map((i) => {
        const src = blocks.find((b) => b.id === i.taskId)!;
        return { ...src, id: i.part ? `${src.id}-${i.part.index}` : src.id, title: i.title, start: i.start, duration: i.end - i.start };
      });
    set({ blocks: nb });
    toast('Жақсартылған жоспар қабылданды');
    setStep(1);
  };

  return (
    <KidShell section="/helper" title="Ақылды көмекші" art={<ArtHelper size={72} />} step={{ n: step, total: 3, label: L[0] }} instruction={L[1]} onBack={step > 1 ? () => setStep(step - 1) : undefined} onNext={step < 3 ? () => { if (step === 2) setChecked(true); setStep(step + 1); } : undefined} nextLabel={step === 1 ? 'Тексеру' : step === 2 ? 'Жақсарту' : 'Келесі'}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SourceTag kind={state.example ? 'demo' : 'mine'} />
        <span className="rounded-full bg-soft-2 px-3 py-1 text-[13px] font-semibold text-ink-2">Көмекші түрі: алгоритм (ереже бойынша есептейді), генеративті ЖИ емес</span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-soft px-4 py-3 text-[17px]">
            <span className="font-semibold">Уақыт:</span>
            <TimeBtns label="Басы" value={ws} onChange={(v) => v < we && set({ windowStart: v })} />
            <span>—</span>
            <TimeBtns label="Соңы" value={we} onChange={(v) => v > ws && v <= 1440 && set({ windowEnd: v })} />
            <span className="font-mono text-ink-3">= {we - ws} мин</span>
            <button type="button" onClick={() => { save(exampleHelper()); setChecked(false); }} className="ml-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-2 hover:text-brand">
              <RotateCcw size={16} /> Мысал жоспар
            </button>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {blocks.map((b) => {
              const Art = ACTIVITY_ART[b.activity];
              return (
                <li key={b.id} className={cx('rounded-3xl border-2 bg-white p-3', bad.has(b.id) ? 'border-coral' : 'border-line')}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: ACTIVITY_TINT[b.activity] }}>
                      <Art size={44} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-semibold">{b.title}</div>
                      <div className="font-mono text-[15px] text-ink-2">
                        {formatHM(b.start)}–{formatHM(b.start + b.duration)}
                      </div>
                    </div>
                    <button type="button" aria-pressed={b.fixed} aria-label={b.fixed ? 'Міндетті іс (басып босату)' : 'Міндетті емес (басып бекіту)'} onClick={() => upd(b.id, { fixed: !b.fixed })} className={cx('grid size-11 place-items-center rounded-xl border-2', b.fixed ? 'border-brand bg-brand-50 text-brand' : 'border-line-2 text-ink-3')}>
                      {b.fixed ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>
                    <button type="button" aria-label={`${b.title} жою`} onClick={() => set({ blocks: blocks.filter((x) => x.id !== b.id) })} className="grid size-11 place-items-center rounded-xl text-ink-3 hover:bg-danger-50 hover:text-danger">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Pair label="Басталуы" value={formatHM(b.start)} onMinus={() => upd(b.id, { start: Math.max(0, b.start - 15) })} onPlus={() => upd(b.id, { start: Math.min(1440 - b.duration, b.start + 15) })} />
                    <Pair label="Ұзақтығы" value={`${b.duration} мин`} onMinus={() => upd(b.id, { duration: Math.max(5, b.duration - 5) })} onPlus={() => upd(b.id, { duration: Math.min(240, b.duration + 5) })} />
                  </div>
                  {b.fixed && <div className="mt-2 text-[13px] text-brand">Міндетті: көмекші бұл істің уақытын өзгертпейді.</div>}
                </li>
              );
            })}
          </ul>
          {adding ? (
            <div className="rounded-3xl border-2 border-brand/30 bg-brand-50/50 p-3">
              <div className="mb-2 font-semibold">Қандай іс қосамыз?</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                {ACTIVITY_IDS.filter((x) => x !== 'sleep' && x !== 'school').map((id) => {
                  const Art = ACTIVITY_ART[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const lastEnd = blocks.reduce((m, b) => Math.max(m, b.start + b.duration), ws);
                        set({ blocks: [...blocks, { id: uid('b'), activity: id as ActivityId, title: ACTIVITIES[id].label, start: Math.min(lastEnd, we - 15), duration: 20, fixed: false }] });
                        setAdding(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-white p-2 text-[13px] font-semibold hover:border-brand"
                    >
                      <Art size={40} />
                      {ACTIVITIES[id].label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <BigButton variant="secondary" icon={<Plus size={18} />} onClick={() => setAdding(true)}>
              Іс қосу
            </BigButton>
          )}
          <div>
            <div className="mb-1.5 text-[15px] font-semibold text-ink-2">Менің уақыт сызығым</div>
            <Timeline label="Менің жоспарым" items={timelineFrom(own, bad)} from={from} to={to} tickEvery={30} height={34} />
            {bad.size > 0 && <p className="mt-1 text-[15px] text-coral">Қызыл жиек — тексеру керек істер.</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-6">
          {!checked ? (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setChecked(true)} className="flex min-h-24 w-full max-w-md items-center justify-center gap-3 rounded-3xl bg-brand px-6 text-2xl font-semibold text-white shadow-lg hover:bg-brand-700">
              <Search size={30} /> Жоспарымды тексер
            </motion.button>
          ) : (
            <div className="flex w-full max-w-3xl flex-col gap-3">
              {advice.map((a, i) => (
                <motion.div key={a.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.25 }}>
                  <ResultMessage tone={a.tone}>{a.text}</ResultMessage>
                </motion.div>
              ))}
              <div className="mt-2">
                <Timeline label="Менің жоспарым" items={timelineFrom(own, bad)} from={from} to={to} tickEvery={30} height={34} />
              </div>
              {!analysis.ok && <p className="text-[17px] text-ink-2">Көмекші жоспарды жақсарта алады. «Жақсарту» батырмасын бас.</p>}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          {result.errors.length > 0 ? (
            <ResultMessage tone="warn">
              Жоспарды жақсарту мүмкін болмады:
              <ul className="mt-1 list-disc pl-5">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              Міндетті істердің уақытын өзгертіп көр.
            </ResultMessage>
          ) : (
            <>
              <div className="rounded-3xl border-2 border-line bg-white p-4">
                <div className="mb-1.5 flex items-center gap-2 font-semibold">
                  Менің жоспарым {!analysis.ok && <XCircle size={18} className="text-coral" />}
                </div>
                <Timeline label="Менің жоспарым" items={timelineFrom(own, bad)} from={from} to={to} tickEvery={30} height={32} />
                <div className="mb-1.5 mt-4 flex items-center gap-2 font-semibold">
                  Көмекші ұсынған жоспар <CheckCircle2 size={18} className="text-ok" />
                </div>
                <Timeline label="Көмекші ұсынған жоспар" items={timelineFrom(result.items)} from={from} to={to} tickEvery={30} height={32} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border-2 border-line bg-white p-4">
                  <div className="mb-2 font-display text-lg font-semibold">Не өзгерді?</div>
                  <ul className="space-y-2 text-[16px] leading-relaxed">
                    {changes.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border-2 border-line bg-white p-4">
                  <div className="mb-2 font-display text-lg font-semibold">Математикалық тексеру</div>
                  <ul className="space-y-2">
                    {checks.map((c) => (
                      <li key={c.id} className="flex items-start gap-2">
                        {c.ok ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" /> : <XCircle size={20} className="mt-0.5 shrink-0 text-danger" />}
                        <div>
                          <div className="text-[16px] font-medium">{CHECK_LABELS[c.id] ?? c.label}</div>
                          {c.id === 'sum' && <div className="font-mono text-[13px] text-ink-3 break-words">{c.detail}</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BigButton variant="teal" icon={<Check size={19} />} onClick={accept}>
                  Осы жоспарды қабылдау
                </BigButton>
                <BigButton variant="secondary" onClick={() => setStep(1)}>
                  Өз жоспарымды өзгерту
                </BigButton>
              </div>
              <ResultMessage tone="info">Көмекші тек ұсыныс береді. Соңғы шешімді сен өзің қабылдайсың.</ResultMessage>
            </>
          )}

          <div className="rounded-2xl border border-line">
            <button type="button" onClick={() => setAdult((x) => !x)} aria-expanded={adult} className="flex w-full items-center justify-between px-4 py-3 text-[15px] font-semibold text-ink-2">
              Ересектерге: параметрлер және тілдік модель
              <ChevronDown size={18} className={cx('transition-transform', adult && 'rotate-180')} />
            </button>
            {adult && (
              <div className="grid gap-3 border-t border-line p-4 text-[15px] sm:grid-cols-3">
                {(
                  [
                    ['reserveMin', 'Ең аз резерв, мин'],
                    ['breakMin', 'Оқудан кейін үзіліс, мин'],
                    ['maxStudyBlock', 'Оқу блогы ≤, мин'],
                  ] as const
                ).map(([k, l]) => (
                  <label key={k} className="flex flex-col gap-1">
                    {l}
                    <input id={`hs-${k}`} type="number" min={0} max={120} value={settings[k]} onChange={(e) => set({ settings: { ...settings, [k]: Math.max(0, Math.min(120, Number(e.target.value) || 0)) } })} className="h-10 rounded-lg border border-line-2 px-3 font-mono" />
                  </label>
                ))}
                <div className="sm:col-span-3">
                  <p className="mb-2 text-ink-3">Тілдік модель міндетті емес. Серверге тек іс түрлері мен минуттар жіберіледі; кілт тек серверде сақталады.</p>
                  <button
                    type="button"
                    disabled={llm.loading || result.errors.length > 0}
                    onClick={async () => {
                      abort.current?.abort();
                      abort.current = new AbortController();
                      setLlm({ loading: true });
                      const r = await askExplanation(result.items, ws, we, abort.current.signal);
                      setLlm({ loading: false, text: r.text, error: r.error });
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-2 px-3 font-medium hover:border-brand disabled:opacity-40"
                  >
                    {llm.loading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />} Тілдік модельден түсіндірме
                  </button>
                  {llm.error && <p className="mt-2 text-ink-2">{llm.error}</p>}
                  {llm.text && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-soft p-3">{llm.text}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </KidShell>
  );
}

function Pair({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl bg-soft px-2 py-1.5">
      <button type="button" onClick={onMinus} aria-label={`${label}: азайту`} className="grid size-11 place-items-center rounded-xl bg-white text-ink-2 shadow-sm hover:text-coral">
        <Minus size={18} />
      </button>
      <div className="text-center">
        <div className="text-[12px] text-ink-3">{label}</div>
        <div className="font-mono text-[16px] font-semibold tnum">{value}</div>
      </div>
      <button type="button" onClick={onPlus} aria-label={`${label}: көбейту`} className="grid size-11 place-items-center rounded-xl bg-white text-brand shadow-sm">
        <Plus size={18} />
      </button>
    </div>
  );
}

function TimeBtns({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" aria-label={`${label}: 30 минут ертерек`} onClick={() => onChange(value - 30)} className="grid size-10 place-items-center rounded-xl border-2 border-line-2 bg-white hover:border-brand">
        <Minus size={16} />
      </button>
      <span className="w-16 text-center font-mono font-semibold">{value === 1440 ? '24:00' : formatHM(value)}</span>
      <button type="button" aria-label={`${label}: 30 минут кейінірек`} onClick={() => onChange(value + 30)} className="grid size-10 place-items-center rounded-xl border-2 border-line-2 bg-white hover:border-brand">
        <Plus size={16} />
      </button>
    </span>
  );
}

export { KID_COLORS };
