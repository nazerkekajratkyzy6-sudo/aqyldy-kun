import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, CalendarRange, FolderOpen, GitCompareArrows, Lock, Plus, Save, Trash2, Unlock, AlertTriangle, MoonStar } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page } from '../components/Layout';
import { Timeline, type TimelineItem } from '../components/Timeline';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '../components/charts';
import { Badge, Button, Callout, Card, CardHeader, DataBadge, Formula, SectionTitle, Segmented, Stat, TimeInput, inputCls, cx } from '../components/ui';
import { CATEGORY_LABELS, analyzePlan, blockDuration, blockSegments, categoryTotals, comparePlans, shiftBlock, type Block, type Category } from '../core/intervals';
import { MINUTES_PER_DAY, formatDuration, formatHM, parseHM } from '../core/time';
import { uid } from '../core/format';
import { CATEGORY_COLORS, C } from '../lib/palette';
import { APPENDIX_PLAN } from '../data/research';
import { useAppData, useSavedList } from '../store/AppData';
import { kvGet, kvSet } from '../store/db';

type DayMode = 'school' | 'weekend';
interface PlanState {
  name: string;
  mode: DayMode;
  blocks: Block[];
  template: boolean;
}

const mk = (title: string, category: Category, s: string, e: string, extra: Partial<Block> = {}): Block => ({ id: uid('b'), title, category, start: parseHM(s)!, end: parseHM(e)!, priority: 2, fixed: false, ...extra });

export function schoolTemplate(): Block[] {
  return APPENDIX_PLAN.map((r) => mk(r.title, r.category, r.start, r.end, r.category === 'school' ? { fixed: true, priority: 1 } : r.category === 'homework' ? { priority: 1 } : {}));
}
export function weekendTemplate(): Block[] {
  return [
    mk('Таңғы дайындық', 'morning', '08:30', '09:00'),
    mk('Демалыс/тамақ', 'rest', '09:00', '10:00'),
    mk('Үй тапсырмасы', 'homework', '10:00', '10:40', { priority: 1 }),
    mk('Қозғалыс', 'movement', '11:00', '12:00'),
    mk('Кітап/қызығушылық', 'reading', '16:00', '16:30'),
    mk('Еркін уақыт', 'free', '17:00', '18:30', { priority: 3 }),
  ];
}

const initialA = (): PlanState => ({ name: 'А жоспары', mode: 'school', blocks: schoolTemplate(), template: true });
const initialB = (): PlanState => ({ name: 'Ә жоспары', mode: 'weekend', blocks: weekendTemplate(), template: true });

export function toTimelineItems(blocks: Block[], badIds: Set<string>): TimelineItem[] {
  return blocks.flatMap((b) =>
    blockSegments(b).map(([s, e], i) => ({ id: `${b.id}-${i}`, label: b.title || '—', start: s, end: e, color: CATEGORY_COLORS[b.category], danger: badIds.has(b.id), muted: b.category === 'morning' })),
  );
}

export default function LabConstructor() {
  const { toast } = useAppData();
  const [plans, setPlans] = useState<{ A: PlanState; B: PlanState }>({ A: initialA(), B: initialB() });
  const [active, setActive] = useState<'A' | 'B'>('A');
  const [loaded, setLoaded] = useState(false);
  const saved = useSavedList<PlanState>('plans');
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    kvGet<{ A: PlanState; B: PlanState }>('constructor.current').then((v) => {
      if (v?.A && v?.B) setPlans(v);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void kvSet('constructor.current', plans);
  }, [plans, loaded]);

  const plan = plans[active];
  const setPlan = (fn: (p: PlanState) => PlanState) => setPlans((ps) => ({ ...ps, [active]: fn(ps[active]) }));
  const setBlocks = (fn: (b: Block[]) => Block[]) => setPlan((p) => ({ ...p, blocks: fn(p.blocks), template: false }));
  const update = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const analysis = useMemo(() => analyzePlan(plan.blocks), [plan.blocks]);
  const badIds = useMemo(() => new Set(analysis.overlaps.flatMap((o) => [o.a, o.b]).concat(analysis.errors.map((e) => e.blockId))), [analysis]);
  const nameOf = (id: string) => plan.blocks.find((b) => b.id === id)?.title ?? '—';

  const diffs = useMemo(() => comparePlans(plans.A.blocks, plans.B.blocks, plans.A.name, plans.B.name), [plans]);
  const catData = useMemo(() => {
    const ta = categoryTotals(plans.A.blocks);
    const tb = categoryTotals(plans.B.blocks);
    return (Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => ta[c] || tb[c]).map((c) => ({ cat: CATEGORY_LABELS[c], A: ta[c], B: tb[c] }));
  }, [plans]);

  const move = (idx: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = idx + dir;
      if (j < 0 || j >= bs.length) return bs;
      const c = [...bs];
      [c[idx], c[j]] = [c[j], c[idx]];
      return c;
    });
  const shift = (b: Block, d: number) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? shiftBlock(x, d) : x)));
  const addBlock = () => {
    const last = plan.blocks.reduce((m, b) => Math.max(m, b.end > b.start ? b.end : 0), 0);
    const start = Math.min(last, MINUTES_PER_DAY - 30);
    setBlocks((bs) => [...bs, { id: uid('b'), title: 'Жаңа блок', category: 'other', start, end: start + 30, priority: 2, fixed: false }]);
  };
  const setMode = (m: DayMode) => setPlan((p) => ({ ...p, mode: m, blocks: m === 'school' ? schoolTemplate() : weekendTemplate(), template: true }));

  return (
    <Page>
      <SectionTitle eyebrow="2-зертхана" title="Күн конструкторы" lead="Блоктарды қос, өзгерт, жылжыт және жой. Жүйе қабаттасуларды, бос аралықтарды, қателерді және түн ортасынан өтуді бірден табады. Екі жоспарды салыстырып, әр айырманы түсіндіреді." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented label="Жоспар" value={active} onChange={setActive} options={[{ value: 'A', label: plans.A.name }, { value: 'B', label: plans.B.name }]} />
        <Segmented label="Күн түрі" value={plan.mode} onChange={setMode} options={[{ value: 'school', label: 'Оқу күні' }, { value: 'weekend', label: 'Демалыс күні' }]} />
        {plan.template && <DataBadge kind="demo" />}
        {plan.template && <span className="text-sm text-ink-3">{plan.mode === 'school' ? 'Шаблон: зерттеу жұмысының Қосымша 1 кестесі.' : 'Демалыс күнінің мысал шаблоны.'}</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title={
              <input aria-label="Жоспар атауы" value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-md border border-transparent bg-transparent px-1 hover:border-line focus:border-brand" />
            }
            subtitle={`${plan.blocks.length} блок · басу/жылжыту/жою мүмкін`}
            icon={<CalendarRange size={18} />}
            actions={
              <Button size="sm" variant="primary" onClick={addBlock}>
                <Plus size={15} /> Блок қосу
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-soft text-xs text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Атауы / санат</th>
                  <th className="px-2 py-2 text-left font-semibold">Басы</th>
                  <th className="px-2 py-2 text-left font-semibold">Соңы</th>
                  <th className="px-2 py-2 text-right font-semibold">Ұзақтығы</th>
                  <th className="px-2 py-2 text-left font-semibold">Басымдық</th>
                  <th className="px-2 py-2 text-center font-semibold">Бекітілген</th>
                  <th className="px-2 py-2 text-right font-semibold">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {plan.blocks.map((b, idx) => {
                    const d = blockDuration(b);
                    const bad = badIds.has(b.id);
                    return (
                      <motion.tr key={b.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cx('border-t border-line align-top', bad && 'bg-danger-50/60')}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: CATEGORY_COLORS[b.category] }} aria-hidden />
                            <input aria-label="Блок атауы" value={b.title} onChange={(e) => update(b.id, { title: e.target.value })} className={cx(inputCls, 'h-9')} />
                          </div>
                          <select aria-label="Санат" value={b.category} onChange={(e) => update(b.id, { category: e.target.value as Category })} className="mt-1 ml-5 h-8 rounded-md border border-line-2 bg-white px-2 text-xs">
                            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                              <option key={c} value={c}>
                                {CATEGORY_LABELS[c]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <TimeInput label={`${b.title}: басталуы`} value={formatHM(b.start)} onChange={(v) => { const m = parseHM(v); if (m !== null && m < MINUTES_PER_DAY) update(b.id, { start: m }); }} />
                        </td>
                        <td className="px-2 py-2">
                          <TimeInput label={`${b.title}: аяқталуы`} value={formatHM(b.end)} onChange={(v) => { const m = parseHM(v); if (m !== null) update(b.id, { end: m === 0 && b.start > 0 ? MINUTES_PER_DAY : m }); }} />
                        </td>
                        <td className="px-2 py-2 text-right font-mono tnum">
                          {d} мин
                          {b.end < b.start && (
                            <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-violet-700">
                              <MoonStar size={12} /> түн ортасы
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <select aria-label="Басымдық" value={b.priority} onChange={(e) => update(b.id, { priority: Number(e.target.value) as 1 | 2 | 3 })} className="h-9 rounded-md border border-line-2 bg-white px-2">
                            <option value={1}>1 — жоғары</option>
                            <option value={2}>2 — орташа</option>
                            <option value={3}>3 — төмен</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" aria-pressed={b.fixed} aria-label={b.fixed ? 'Бекітілген (басып босату)' : 'Бекітілмеген (басып бекіту)'} onClick={() => update(b.id, { fixed: !b.fixed })} className={cx('grid size-9 place-items-center rounded-lg border', b.fixed ? 'border-brand bg-brand-50 text-brand' : 'border-line-2 text-ink-3')}>
                            {b.fixed ? <Lock size={15} /> : <Unlock size={15} />}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1">
                            <IconBtn label="Жоғары" onClick={() => move(idx, -1)} disabled={idx === 0}>
                              <ArrowUp size={14} />
                            </IconBtn>
                            <IconBtn label="Төмен" onClick={() => move(idx, 1)} disabled={idx === plan.blocks.length - 1}>
                              <ArrowDown size={14} />
                            </IconBtn>
                            <IconBtn label="15 мин ертерек" onClick={() => shift(b, -15)} disabled={b.fixed}>
                              <span className="font-mono text-[11px]">−15</span>
                            </IconBtn>
                            <IconBtn label="15 мин кейін" onClick={() => shift(b, 15)} disabled={b.fixed}>
                              <span className="font-mono text-[11px]">+15</span>
                            </IconBtn>
                            <IconBtn label="Жою" onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))} danger>
                              <Trash2 size={14} />
                            </IconBtn>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-4">
            <Timeline label="Тәуліктік уақыт сызығы" items={toTimelineItems(plan.blocks, badIds)} from={0} to={MINUTES_PER_DAY} tickEvery={180} height={26} />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">Жоспарды тексеру</h3>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <Stat label="Σ блоктар" value={analysis.scheduledSum} unit="мин" />
              <Stat label="Жоспарсыз" value={analysis.uncoveredMinutes} unit="мин" tone="teal" />
              <Stat label="Қабаттасу" value={analysis.overlapMinutes} unit="мин" tone={analysis.overlapMinutes ? 'danger' : 'ok'} />
            </div>
            <Formula className="mt-3" label="Тәуліктің жабылуы">
              жабылған {analysis.coveredMinutes} + жоспарсыз {analysis.uncoveredMinutes} = {analysis.coveredMinutes + analysis.uncoveredMinutes} мин
            </Formula>
            <div className="mt-4 space-y-3">
              {analysis.ok ? <Callout tone="ok">Қабаттасу мен қате жоқ.</Callout> : null}
              {analysis.errors.length > 0 && (
                <Callout tone="danger" title={`Қателер (${analysis.errors.length})`}>
                  <ul className="list-disc pl-4">
                    {analysis.errors.map((e, i) => (
                      <li key={i}>
                        «{nameOf(e.blockId)}»: {e.message}
                      </li>
                    ))}
                  </ul>
                </Callout>
              )}
              {analysis.overlaps.length > 0 && (
                <Callout tone="danger" title={`Қабаттасулар (${analysis.overlaps.length})`}>
                  <ul className="list-disc pl-4">
                    {analysis.overlaps.map((o, i) => (
                      <li key={i}>
                        «{nameOf(o.a)}» мен «{nameOf(o.b)}»: {formatHM(o.start)}–{formatHM(o.end)}, {o.minutes} мин
                      </li>
                    ))}
                  </ul>
                </Callout>
              )}
              {analysis.midnight.length > 0 && (
                <Callout tone="info" title="Түн ортасынан өту">
                  {analysis.midnight.map((id) => `«${nameOf(id)}»`).join(', ')} 24:00-ден өтеді; ұзақтығы келесі тәулікке ауысып есептеледі: (1440 − басы) + соңы.
                </Callout>
              )}
              <div>
                <div className="mb-1.5 text-sm font-semibold">Бос аралықтар ({analysis.gaps.length})</div>
                {analysis.gaps.length === 0 ? (
                  <p className="text-sm text-ink-3">Бос аралық жоқ — тәулік толық жабылған.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {analysis.gaps.map((g, i) => (
                      <li key={i}>
                        <Badge tone="teal">
                          {formatHM(g.start)}–{g.end === MINUTES_PER_DAY ? '24:00' : formatHM(g.end)} · {formatDuration(g.minutes)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">Жоспарды сақтау</h3>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await saved.save(saveName.trim() || plan.name, plan);
                setSaveName('');
                toast('Жоспар сақталды');
              }}
            >
              <input className={inputCls} placeholder={plan.name} value={saveName} onChange={(e) => setSaveName(e.target.value)} aria-label="Сақталатын атау" />
              <Button type="submit" variant="primary">
                <Save size={16} />
              </Button>
            </form>
            <ul className="mt-3 space-y-1.5">
              {saved.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="truncate">
                    {it.name} <span className="text-ink-3">· {it.data.blocks.length} блок</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPlans((ps) => ({ ...ps, A: { ...it.data, name: it.name, template: false } }))} aria-label={`${it.name}: А орнына ашу`}>
                      <FolderOpen size={14} /> А
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPlans((ps) => ({ ...ps, B: { ...it.data, name: it.name, template: false } }))} aria-label={`${it.name}: Ә орнына ашу`}>
                      <FolderOpen size={14} /> Ә
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => saved.del(it.id)} aria-label={`${it.name} жою`}>
                      <Trash2 size={14} />
                    </Button>
                  </span>
                </li>
              ))}
              {saved.items.length === 0 && <li className="text-sm text-ink-3">Сақталған жоспар жоқ.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title={`Екі жоспарды салыстыру: ${plans.A.name} ↔ ${plans.B.name}`} subtitle="Әр айырма есептеу жолымен түсіндіріледі" icon={<GitCompareArrows size={18} />} />
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <Timeline label={plans.A.name} items={toTimelineItems(plans.A.blocks, new Set())} from={0} to={MINUTES_PER_DAY} tickEvery={240} height={22} />
            <Timeline label={plans.B.name} items={toTimelineItems(plans.B.blocks, new Set())} from={0} to={MINUTES_PER_DAY} tickEvery={240} height={22} />
            <ChartFrame
              title="Санаттар бойынша минут"
              legend={[
                { color: C.slateLight, label: plans.A.name },
                { color: C.blue, label: plans.B.name },
              ]}
              table={{ head: ['Санат', plans.A.name, plans.B.name, 'Айырма'], rows: catData.map((r) => [r.cat, r.A, r.B, r.B - r.A]) }}
              height={260}
            >
              <ResponsiveContainer>
                <BarChart data={catData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="cat" {...axisProps} interval={0} angle={-25} textAnchor="end" height={56} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F6F9FC' }} />
                  <Bar dataKey="A" name={plans.A.name} fill={C.slateLight} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B" name={plans.B.name} fill={C.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">Айырмалар ({diffs.length})</div>
            {diffs.length === 0 ? (
              <Callout tone="ok">Жоспарлар бірдей.</Callout>
            ) : (
              <ol className="max-h-[560px] space-y-2 overflow-auto pr-1">
                {diffs.map((d, i) => (
                  <li key={i} className="rounded-xl border border-line px-3 py-2.5 text-sm">
                    <div className="mb-0.5 flex items-center gap-2">
                      <Badge tone={d.kind === 'category' ? 'brand' : d.kind === 'shift' ? 'teal' : d.kind === 'duration' ? 'warn' : 'neutral'}>{{ category: 'Санат', shift: 'Жылжу', duration: 'Ұзақтық', onlyA: `Тек ${plans.A.name}`, onlyB: `Тек ${plans.B.name}` }[d.kind]}</Badge>
                      <span className="font-medium">{d.label}</span>
                    </div>
                    <p className="text-ink-2">{d.explanation}</p>
                  </li>
                ))}
              </ol>
            )}
            {(plans.A.mode !== plans.B.mode) && (
              <Callout tone="warn" className="mt-3">
                Оқу күні мен демалыс күні салыстырылуда. Бұл айырмалардың бір бөлігі күн түріне байланысты — тұжырым жасағанда ескеріңіз.
              </Callout>
            )}
          </div>
        </div>
      </Card>
      {analysis.uncoveredMinutes === MINUTES_PER_DAY && (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-3">
          <AlertTriangle size={15} /> Жоспарда блок жоқ.
        </p>
      )}
    </Page>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={cx('grid size-8 place-items-center rounded-lg border border-line text-ink-2 disabled:opacity-35', danger ? 'hover:border-danger hover:text-danger' : 'hover:border-brand hover:text-brand')}>
      {children}
    </button>
  );
}
