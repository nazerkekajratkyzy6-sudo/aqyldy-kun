import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, Lock, Plus, RotateCcw, ShieldCheck, Trash2, Unlock, Wand2, Loader2 } from 'lucide-react';
import { KIND_LABELS, buildSchedule, compareSchedules, naiveSchedule, scheduleStats, verifySchedule, type PlanItem, type PlanTask, type SchedulerInput, type TaskKind } from '../core/scheduler';
import { formatHM, parseHM } from '../core/time';
import { uid } from '../core/format';
import { KIND_COLORS } from '../lib/palette';
import { SAMPLE_REQUEST, SAMPLE_WINDOW } from '../data/research';
import { askExplanation } from '../lib/llm';
import { kvGet, kvSet } from '../store/db';
import { Timeline, type TimelineItem } from './Timeline';
import { DataTable } from './charts';
import { Badge, Button, Callout, Card, CardHeader, CheckRow, DataBadge, Field, Formula, MinutesInput, Stat, TimeInput, cx, inputCls } from './ui';

export interface AssistantState {
  windowStart: string;
  windowEnd: string;
  reserveMin: number;
  breakMin: number;
  maxStudyBlock: number;
  tasks: PlanTask[];
}

export function demoAssistantState(): AssistantState {
  return {
    windowStart: formatHM(SAMPLE_WINDOW.start),
    windowEnd: formatHM(SAMPLE_WINDOW.end),
    reserveMin: 20,
    breakMin: 5,
    maxStudyBlock: 30,
    tasks: SAMPLE_REQUEST.map((t) => ({ id: t.id, title: t.title, kind: t.kind, duration: t.duration, priority: t.kind === 'study' ? 1 : 2, fixed: false, fixedStart: null })),
  };
}

export function toInput(s: AssistantState): SchedulerInput | null {
  const ws = parseHM(s.windowStart);
  const we = parseHM(s.windowEnd);
  if (ws === null || we === null) return null;
  return { windowStart: ws, windowEnd: we, reserveMin: s.reserveMin, breakMin: s.breakMin, maxStudyBlock: s.maxStudyBlock, tasks: s.tasks };
}

export function itemsToTimeline(items: PlanItem[], conflictIds = new Set<string>()): TimelineItem[] {
  return items.map((i) => ({ id: i.id, label: i.title, start: i.start, end: i.end, color: KIND_COLORS[i.kind], dashed: i.kind === 'reserve', muted: i.kind === 'break' || i.kind === 'reserve', danger: conflictIds.has(i.id) }));
}

function conflictIdsOf(items: PlanItem[], ws: number, we: number) {
  const ids = new Set<string>();
  const real = items.filter((i) => i.kind !== 'reserve');
  for (let a = 0; a < real.length; a++) {
    if (real[a].start < ws || real[a].end > we) ids.add(real[a].id);
    for (let b = a + 1; b < real.length; b++) if (Math.min(real[a].end, real[b].end) > Math.max(real[a].start, real[b].start)) ids.add(real[a].id).add(real[b].id);
  }
  return ids;
}

const isDemo = (s: AssistantState) => JSON.stringify(s) === JSON.stringify(demoAssistantState());

/** 4-зертхананың жұмыс алаңы (5-эксперимент пен қорғау режимінде де қолданылады). */
export function AssistantWorkbench({ storageKey = 'assistant.current', compact = false, onResult }: { storageKey?: string; compact?: boolean; onResult?: (r: { state: AssistantState; ok: boolean; before: ReturnType<typeof scheduleStats>; after: ReturnType<typeof scheduleStats> }) => void }) {
  const [state, setState] = useState<AssistantState>(demoAssistantState);
  const [loaded, setLoaded] = useState(false);
  const [llm, setLlm] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    kvGet<AssistantState>(storageKey).then((v) => {
      if (v && Array.isArray(v.tasks)) setState(v);
      setLoaded(true);
    });
  }, [storageKey]);
  useEffect(() => {
    if (loaded) void kvSet(storageKey, state);
  }, [state, loaded, storageKey]);

  const input = toInput(state);
  const result = useMemo(() => (input ? buildSchedule(input) : null), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps
  const before = useMemo(() => (input ? naiveSchedule(input) : []), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps
  const checks = result && input ? verifySchedule(result, input) : [];
  const stB = input ? scheduleStats(before, input.windowStart, input.windowEnd) : null;
  const stA = result && input ? scheduleStats(result.items, input.windowStart, input.windowEnd) : null;
  const rows = result && input ? compareSchedules(before, result, input) : [];
  const allOk = checks.length > 0 && checks.every((c) => c.ok) && !!result && result.errors.length === 0;

  useEffect(() => {
    if (onResult && stA && stB) onResult({ state, ok: allOk, before: stB, after: stA });
  }, [JSON.stringify(stA), JSON.stringify(stB), allOk]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLlm({ loading: false });
    abort.current?.abort();
  }, [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTask = (id: string, patch: Partial<PlanTask>) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const W = input ? input.windowEnd - input.windowStart : 0;
  const tick = W > 360 ? 60 : 30;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Кіріс деректер"
          subtitle="Уақыт терезесі, тапсырмалар, резерв және үзіліс"
          icon={<Bot size={18} />}
          actions={
            <>
              {isDemo(state) ? <DataBadge kind="demo" /> : <DataBadge kind="edited" />}
              <Button size="sm" variant="ghost" onClick={() => setState(demoAssistantState())}>
                <RotateCcw size={15} /> Мысал
              </Button>
            </>
          }
        />
        <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-1">
            <Field label="Терезе басы">
              <TimeInput label="Терезе басы" value={state.windowStart} onChange={(v) => setState((s) => ({ ...s, windowStart: v }))} />
            </Field>
            <Field label="Терезе соңы">
              <TimeInput label="Терезе соңы" value={state.windowEnd} onChange={(v) => setState((s) => ({ ...s, windowEnd: v }))} />
            </Field>
            <Field label="Ең аз резерв">
              <MinutesInput label="Ең аз резерв" value={state.reserveMin} onChange={(v) => setState((s) => ({ ...s, reserveMin: Math.max(0, v) }))} compact />
            </Field>
            <Field label="Үзіліс (оқудан кейін)">
              <MinutesInput label="Үзіліс" value={state.breakMin} max={30} onChange={(v) => setState((s) => ({ ...s, breakMin: Math.max(0, v) }))} compact />
            </Field>
            <Field label="Оқу блогы ≤" hint="0 — бөлмеу">
              <MinutesInput label="Оқу блогының ең ұзақ мәні" value={state.maxStudyBlock} max={180} onChange={(v) => setState((s) => ({ ...s, maxStudyBlock: Math.max(0, v) }))} compact />
            </Field>
          </div>
          <div className="min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-xs text-ink-3">
                  <tr>
                    <th className="pb-2 text-left font-semibold">Тапсырма</th>
                    <th className="pb-2 text-left font-semibold">Түрі</th>
                    <th className="pb-2 text-left font-semibold">Ұзақтығы</th>
                    <th className="pb-2 text-left font-semibold">Басымдық</th>
                    <th className="pb-2 text-left font-semibold">Бекітілген уақыт</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.tasks.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="size-3 shrink-0 rounded-[3px]" style={{ background: KIND_COLORS[t.kind] }} aria-hidden />
                          <input aria-label="Тапсырма атауы" className={cx(inputCls, 'h-9')} value={t.title} onChange={(e) => setTask(t.id, { title: e.target.value })} />
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <select aria-label="Түрі" className="h-9 rounded-md border border-line-2 bg-white px-2" value={t.kind} onChange={(e) => setTask(t.id, { kind: e.target.value as TaskKind })}>
                          {(['study', 'reading', 'movement', 'rest', 'screen', 'other'] as TaskKind[]).map((k) => (
                            <option key={k} value={k}>
                              {KIND_LABELS[k]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <MinutesInput label={`${t.title}: ұзақтығы`} value={t.duration} max={W || 1440} onChange={(v) => setTask(t.id, { duration: Math.max(0, v) })} compact />
                      </td>
                      <td className="py-2 pr-2">
                        <select aria-label="Басымдық" className="h-9 rounded-md border border-line-2 bg-white px-2" value={t.priority} onChange={(e) => setTask(t.id, { priority: Number(e.target.value) as 1 | 2 | 3 })}>
                          <option value={1}>1 — жоғары</option>
                          <option value={2}>2 — орташа</option>
                          <option value={3}>3 — төмен</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" aria-pressed={t.fixed} aria-label={t.fixed ? 'Бекітілген' : 'Бекітілмеген'} onClick={() => setTask(t.id, { fixed: !t.fixed, fixedStart: t.fixedStart ?? input?.windowStart ?? 960 })} className={cx('grid size-9 place-items-center rounded-lg border', t.fixed ? 'border-brand bg-brand-50 text-brand' : 'border-line-2 text-ink-3')}>
                            {t.fixed ? <Lock size={15} /> : <Unlock size={15} />}
                          </button>
                          {t.fixed && <TimeInput label={`${t.title}: бекітілген басталу уақыты`} value={formatHM(t.fixedStart ?? 0)} onChange={(v) => { const m = parseHM(v); if (m !== null) setTask(t.id, { fixedStart: m }); }} />}
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <button type="button" aria-label={`${t.title} жою`} onClick={() => setState((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }))} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-danger-50 hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid('t'), title: 'Экран', kind: 'screen', duration: 30, priority: 3, fixed: false, fixedStart: null }] }))}>
                <Plus size={14} /> Экран
              </Button>
              <Button size="sm" onClick={() => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid('t'), title: 'Үйірме', kind: 'other', duration: 45, priority: 1, fixed: true, fixedStart: (input?.windowStart ?? 960) + 60 }] }))}>
                <Plus size={14} /> Бекітілген үйірме
              </Button>
              <Button size="sm" onClick={() => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid('t'), title: 'Жаңа тапсырма', kind: 'other', duration: 15, priority: 2, fixed: false, fixedStart: null }] }))}>
                <Plus size={14} /> Тапсырма
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {!input || !result ? (
        <Callout tone="danger">Уақыт терезесі дұрыс енгізілмеген.</Callout>
      ) : result.errors.length > 0 ? (
        <Callout tone="danger" title="Жоспар құру мүмкін емес — кіріс деректерді түзетіңіз">
          <ul className="list-disc pl-4">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Callout>
      ) : (
        <>
          <Card>
            <CardHeader title="Дейін және кейін" subtitle="«Дейін» — тапсырмалар жазылған ретпен қатарынан қойылған; «Кейін» — алгоритм ұсынысы" icon={<Wand2 size={18} />} />
            <div className="grid gap-5 p-5">
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  Дейін <Badge tone={stB!.conflicts || stB!.overflow ? 'danger' : 'neutral'}>{stB!.conflicts} қабаттасу · {stB!.overflow} мин шектен тыс</Badge>
                </div>
                <Timeline label="Дейін" items={itemsToTimeline(before, conflictIdsOf(before, input.windowStart, input.windowEnd))} from={Math.min(input.windowStart, ...before.map((b) => b.start))} to={Math.max(input.windowEnd, ...before.map((b) => b.end))} tickEvery={tick} height={30} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  Кейін <ArrowRight size={14} className="text-ink-3" /> <Badge tone={allOk ? 'ok' : 'warn'}>{allOk ? 'тексеруден өтті' : 'тексеруді қара'}</Badge>
                </div>
                <Timeline label="Кейін" items={itemsToTimeline(result.items)} from={input.windowStart} to={input.windowEnd} tickEvery={tick} height={30} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Қабаттасу" value={stA!.conflicts} hint={`дейін: ${stB!.conflicts}`} tone={stA!.conflicts ? 'danger' : 'ok'} />
                <Stat label="Резерв" value={stA!.reserve} unit="мин" hint={`дейін: ${stB!.reserve} мин; айырма ${stA!.reserve - stB!.reserve >= 0 ? '+' : ''}${stA!.reserve - stB!.reserve}`} tone="teal" />
                <Stat label="Үзілістер" value={stA!.breaks} unit="мин" hint={`дейін: ${stB!.breaks} мин`} />
                <Stat label="Шектен тыс" value={stA!.overflow} unit="мин" hint={`дейін: ${stB!.overflow} мин`} tone={stA!.overflow ? 'danger' : 'ok'} />
              </div>
            </div>
          </Card>

          <div className={cx('grid gap-6', !compact && 'lg:grid-cols-2')}>
            <Card>
              <CardHeader title="Әр өзгерістің себебі" subtitle="Ауыстыру, минуттағы айырма және себеп" />
              <div className="overflow-x-auto p-2">
                <DataTable
                  head={['Тапсырма', 'Дейін', 'Кейін', 'Жылжу', 'Себеп']}
                  rows={rows.map((r) => [r.title, r.before, r.after, r.shift === null ? '—' : `${r.shift > 0 ? '+' : ''}${r.shift} мин`, <span className="block max-w-72 text-left font-sans text-xs text-ink-2">{r.reason}</span>])}
                />
              </div>
              <ul className="space-y-1.5 border-t border-line p-5 text-sm text-ink-2">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    {r}
                  </li>
                ))}
                {result.unplaced.map((u) => (
                  <li key={u.taskId} className="flex gap-2 text-danger">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />«{u.title}» ({u.minutes} мин) орналаспады: {u.reason}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Математикалық тексеру" subtitle="Оқушы өзі де қайта есептей алады" icon={<ShieldCheck size={18} />} />
              <ul className="px-5 py-3">
                {checks.map((c) => (
                  <CheckRow key={c.id} ok={c.ok} label={c.label} detail={c.detail} />
                ))}
              </ul>
              <div className="border-t border-line p-5">
                <Formula label="Негізгі теңдік">
                  Σ(тапсырмалар) + Σ(үзілістер) + резерв = {stA!.busy} + {stA!.breaks} + {stA!.reserve} = {stA!.busy + stA!.breaks + stA!.reserve} = {W} мин
                </Formula>
                <p className="mt-3 text-xs leading-relaxed text-ink-3">Бұл — детерминирленген алгоритм (ережелер жиыны), генеративті ЖИ емес: бірдей деректер әрқашан бірдей жоспар береді. Ұсынысты оқушы өзі тексеріп, қабылдайды немесе өзгертеді.</p>
              </div>
              <div className="border-t border-line p-5">
                <div className="mb-2 text-sm font-semibold">Тілдік модель (міндетті емес)</div>
                <p className="mb-3 text-xs text-ink-3">Серверге тек әрекет түрлері мен минуттар жіберіледі: атаулар мен жеке деректер жіберілмейді. Кілт тек серверде.</p>
                <Button
                  size="sm"
                  disabled={llm.loading}
                  onClick={async () => {
                    abort.current?.abort();
                    abort.current = new AbortController();
                    setLlm({ loading: true });
                    const r = await askExplanation(result.items, input.windowStart, input.windowEnd, abort.current.signal);
                    setLlm({ loading: false, text: r.text, error: r.error });
                  }}
                >
                  {llm.loading ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />} Түсіндірме сұрау
                </Button>
                {llm.error && <Callout tone="info" className="mt-3">{llm.error}</Callout>}
                {llm.text && (
                  <div className="mt-3 rounded-xl border border-line bg-soft p-3 text-sm leading-relaxed">
                    <div className="mb-1 text-xs font-semibold text-amber-700">Тілдік модель жауабы — ұсыныс, математикалық тексеру жоғарыда</div>
                    <p className="whitespace-pre-wrap">{llm.text}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
