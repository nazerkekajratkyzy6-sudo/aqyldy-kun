import { MINUTES_PER_DAY, formatHM } from './time';
import { buildSchedule, type PlanItem, type ScheduleResult, type SchedulerInput, type TaskKind } from './scheduler';

/**
 * Балаға арналған интерфейстің математикалық ядросы.
 * «Менің күнім» моделі: тәулік = Σ істер + бос уақыт = 1440 минут.
 */

export const ACTIVITY_IDS = ['sleep', 'school', 'homework', 'food', 'rest', 'reading', 'movement', 'play', 'screen'] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];
export type WithFree = ActivityId | 'free';

export interface ActivityInfo {
  label: string;
  /** барыс септігі: «кітап оқуға» */
  dat: string;
  /** шығыс септігі: «кітап оқудан» */
  abl: string;
  kind: TaskKind;
}

export const ACTIVITIES: Record<WithFree, ActivityInfo> = {
  sleep: { label: 'Ұйқы', dat: 'ұйқыға', abl: 'ұйқыдан', kind: 'rest' },
  school: { label: 'Мектеп', dat: 'мектепке', abl: 'мектептен', kind: 'other' },
  homework: { label: 'Үй тапсырмасы', dat: 'үй тапсырмасына', abl: 'үй тапсырмасынан', kind: 'study' },
  food: { label: 'Тамақтану', dat: 'тамақтануға', abl: 'тамақтанудан', kind: 'rest' },
  rest: { label: 'Демалыс', dat: 'демалысқа', abl: 'демалыстан', kind: 'rest' },
  reading: { label: 'Кітап оқу', dat: 'кітап оқуға', abl: 'кітап оқудан', kind: 'reading' },
  movement: { label: 'Қозғалыс', dat: 'қозғалысқа', abl: 'қозғалыстан', kind: 'movement' },
  play: { label: 'Ойын', dat: 'ойынға', abl: 'ойыннан', kind: 'other' },
  screen: { label: 'Экран', dat: 'экранға', abl: 'экраннан', kind: 'screen' },
  free: { label: 'Бос уақыт', dat: 'бос уақытқа', abl: 'бос уақыттан', kind: 'other' },
};

export type DayPlan = Record<ActivityId, number>;

export function emptyDay(): DayPlan {
  return Object.fromEntries(ACTIVITY_IDS.map((id) => [id, 0])) as DayPlan;
}

/**
 * Мысал күн (ҮЛГІ). Мектеп, үй тапсырмасы, демалыс, қозғалыс, кітап — зерттеу жұмысының Қосымша 1 кестесінен;
 * экран 60 мин — 2.2-кестедегі жоспар; ұйқы, тамақтану, ойын — мысал мәндер.
 */
export const EXAMPLE_DAY: DayPlan = { sleep: 600, school: 300, homework: 60, food: 60, rest: 60, reading: 30, movement: 30, play: 30, screen: 60 };

export function dayTotal(p: DayPlan): number {
  return ACTIVITY_IDS.reduce((s, id) => s + (p[id] ?? 0), 0);
}

/** Бос уақыт = 1440 − Σ істер */
export function dayFree(p: DayPlan): number {
  return MINUTES_PER_DAY - dayTotal(p);
}

export function valueOf(p: DayPlan, id: WithFree): number {
  return id === 'free' ? dayFree(p) : p[id];
}

export interface SetResult {
  plan: DayPlan;
  applied: number;
  max: number;
  clamped: boolean;
}

/** Бір істің уақытын өзгерту. Шегі: қазіргі мән + бос уақыт. Теріс мән → 0. */
export function setActivity(p: DayPlan, id: ActivityId, minutes: number): SetResult {
  const max = p[id] + Math.max(0, dayFree(p));
  let v = Number.isFinite(minutes) ? Math.round(minutes) : 0;
  let clamped = false;
  if (v < 0) {
    v = 0;
    clamped = true;
  }
  if (v > max) {
    v = max;
    clamped = true;
  }
  return { plan: { ...p, [id]: v }, applied: v, max, clamped };
}

/** «Кітап оқуға 10 минут қостың. Бос уақыт 10 минутқа азайды.» */
export function changeSentence(id: ActivityId, before: number, after: number, wanted?: number): string {
  const a = ACTIVITIES[id];
  const d = after - before;
  if (wanted !== undefined && wanted > after && d >= 0) {
    return d > 0
      ? `Бос уақыт таусылды: ${a.dat} тек ${d} минут қоса алдың. Тәулікте 1440 минуттан артық жоқ.`
      : `Бос уақыт қалмады. Тәулікте 1440 минуттан артық жоқ, сондықтан ${a.dat} уақыт қосу үшін басқа істі азайт.`;
  }
  if (d > 0) return `${cap(a.dat)} ${d} минут қостың. Бос уақыт ${d} минутқа азайды.`;
  if (d < 0) return `${cap(a.abl)} ${-d} минут алдың. Бос уақыт ${-d} минутқа көбейді.`;
  return `${a.label}: уақыт өзгермеді.`;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('kk-KZ') + s.slice(1);

/** Сағат пен минутты минутқа: 1 сағ 30 мин → 90 */
export function hmToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

export interface TransferResult {
  before: DayPlan;
  after: DayPlan;
  moved: number;
  requested: number;
  fromBefore: number;
  fromAfter: number;
  toBefore: number;
  toAfter: number;
  totalBefore: number;
  totalAfter: number;
}

/**
 * 2-тәжірибе: бір істен екіншісіне минут ауыстыру.
 * Жалпы уақыт (істер + бос уақыт) әрқашан 1440 болып қалады.
 */
export function transfer(p: DayPlan, from: WithFree, to: WithFree, amount: number): TransferResult {
  const req = Math.max(0, Math.round(amount));
  const available = valueOf(p, from);
  const moved = from === to ? 0 : Math.min(req, Math.max(0, available));
  const after = { ...p };
  if (from !== 'free') after[from] -= moved;
  if (to !== 'free') after[to] += moved;
  const total = (x: DayPlan) => dayTotal(x) + dayFree(x);
  return {
    before: p,
    after,
    moved,
    requested: req,
    fromBefore: valueOf(p, from),
    fromAfter: valueOf(after, from),
    toBefore: valueOf(p, to),
    toAfter: valueOf(after, to),
    totalBefore: total(p),
    totalAfter: total(after),
  };
}

export const COMPARE_METRICS: WithFree[] = ['homework', 'reading', 'rest', 'screen', 'free', 'sleep', 'movement'];
/** Азаймауы керек көрсеткіштер (денсаулық пен теңгерім үшін) */
const CARE: WithFree[] = ['sleep', 'rest', 'free', 'movement'];

export interface BalancedVerdict {
  kind: 'same' | 'a' | 'b' | 'mixed';
  diffs: Array<{ id: WithFree; a: number; b: number; diff: number }>;
  reasons: string[];
  summary: string;
}

/**
 * 3-тәжірибе: екі жоспарды теңгерімді салыстыру.
 * Оқу уақыты көп болғаны үшін ғана жоспар «тиімді» деп жарияланбайды:
 * ұйқы, демалыс, бос уақыт және қозғалыс азаймауы шарт.
 */
export function compareBalanced(a: DayPlan, b: DayPlan, nameA = 'А жоспары', nameB = 'Ә жоспары'): BalancedVerdict {
  const all: WithFree[] = [...ACTIVITY_IDS, 'free'];
  const diffs = all.map((id) => ({ id, a: valueOf(a, id), b: valueOf(b, id), diff: valueOf(b, id) - valueOf(a, id) }));
  const d = (id: WithFree) => diffs.find((x) => x.id === id)!.diff;
  if (diffs.every((x) => x.diff === 0)) return { kind: 'same', diffs, reasons: ['Екі жоспар бірдей.'], summary: 'Екі жоспар бірдей.' };

  const reasons: string[] = [];
  const careLossB = CARE.filter((id) => d(id) < 0);
  const careLossA = CARE.filter((id) => d(id) > 0);
  const goodB = (d('reading') > 0 ? 1 : 0) + (d('movement') > 0 ? 1 : 0) + (d('screen') < 0 ? 1 : 0);
  const goodA = (d('reading') < 0 ? 1 : 0) + (d('movement') < 0 ? 1 : 0) + (d('screen') > 0 ? 1 : 0);

  for (const x of diffs) {
    if (x.diff === 0) continue;
    const info = ACTIVITIES[x.id];
    const more = x.diff > 0 ? nameB : nameA;
    reasons.push(`${info.label}: ${nameA} — ${x.a} мин, ${nameB} — ${x.b} мин. ${more} ${Math.abs(x.diff)} минут артық.`);
  }
  if (d('homework') !== 0) reasons.push('Үй тапсырмасының уақыты көп болса, жоспар өздігінен тиімді болмайды: ұйқы, демалыс және бос уақыт та керек.');
  for (const id of careLossB) reasons.push(`${nameB}: ${ACTIVITIES[id].label.toLocaleLowerCase('kk-KZ')} ${-d(id)} минутқа азайған — бұл теңгерімге зиян.`);
  for (const id of careLossA) reasons.push(`${nameA}: ${ACTIVITIES[id].label.toLocaleLowerCase('kk-KZ')} ${d(id)} минутқа аз.`);

  let kind: BalancedVerdict['kind'];
  let summary: string;
  if (careLossB.length === 0 && goodB > 0 && goodA === 0) {
    kind = 'b';
    summary = `${nameB} теңгерімдірек: ұйқы, демалыс, бос уақыт және қозғалыс азайған жоқ, ал ${[d('reading') > 0 && 'кітап оқу көбейген', d('movement') > 0 && 'қозғалыс көбейген', d('screen') < 0 && 'экран азайған'].filter(Boolean).join(', ')}.`;
  } else if (careLossA.length === 0 && goodA > 0 && goodB === 0) {
    kind = 'a';
    summary = `${nameA} теңгерімдірек: ұйқы, демалыс, бос уақыт және қозғалыс азайған жоқ, ал ${[d('reading') < 0 && 'кітап оқу көбірек', d('movement') < 0 && 'қозғалыс көбірек', d('screen') > 0 && 'экран азырақ'].filter(Boolean).join(', ')}.`;
  } else {
    kind = 'mixed';
    summary = 'Әр жоспардың өз артықшылығы бар. Біреуін ғана «тиімді» деп айту үшін ұйқы, демалыс пен бос уақыт азаймауы керек.';
  }
  return { kind, diffs, reasons, summary };
}

/* ---------------- Ақылды көмекші: баланың уақыт терезесіндегі жоспары ---------------- */

export interface ChildBlock {
  id: string;
  activity: ActivityId;
  title: string;
  start: number;
  duration: number;
  /** міндетті іс — орны өзгермейді */
  fixed: boolean;
}

export interface ChildAnalysis {
  windowStart: number;
  windowEnd: number;
  window: number;
  sum: number;
  sumExpr: string;
  covered: number;
  free: number;
  deficit: number;
  overlaps: Array<{ a: string; b: string; start: number; end: number; minutes: number }>;
  outside: Array<{ id: string; minutes: number; late: boolean }>;
  ok: boolean;
}

export function analyzeChildPlan(blocks: ChildBlock[], windowStart: number, windowEnd: number): ChildAnalysis {
  const W = windowEnd - windowStart;
  const real = blocks.filter((b) => b.duration > 0);
  const sum = real.reduce((s, b) => s + b.duration, 0);
  const overlaps: ChildAnalysis['overlaps'] = [];
  for (let i = 0; i < real.length; i++)
    for (let j = i + 1; j < real.length; j++) {
      const s = Math.max(real[i].start, real[j].start);
      const e = Math.min(real[i].start + real[i].duration, real[j].start + real[j].duration);
      if (e > s) overlaps.push({ a: real[i].id, b: real[j].id, start: s, end: e, minutes: e - s });
    }
  const outside = real
    .map((b) => {
      const early = Math.max(0, windowStart - b.start);
      const late = Math.max(0, b.start + b.duration - windowEnd);
      return { id: b.id, minutes: Math.min(b.duration, early + late), late: late > 0 };
    })
    .filter((o) => o.minutes > 0);
  // терезе ішіндегі жабылған минуттар
  const segs = real.map((b) => [Math.max(windowStart, b.start), Math.min(windowEnd, b.start + b.duration)] as [number, number]).filter(([s, e]) => e > s).sort((x, y) => x[0] - y[0]);
  let covered = 0;
  let cur: [number, number] | null = null;
  for (const sg of segs) {
    if (!cur || sg[0] > cur[1]) {
      if (cur) covered += cur[1] - cur[0];
      cur = [...sg];
    } else cur[1] = Math.max(cur[1], sg[1]);
  }
  if (cur) covered += cur[1] - cur[0];
  return {
    windowStart,
    windowEnd,
    window: W,
    sum,
    sumExpr: real.map((b) => b.duration).join(' + ') || '0',
    covered,
    free: W - covered,
    deficit: Math.max(0, sum - W),
    overlaps,
    outside,
    ok: overlaps.length === 0 && outside.length === 0 && sum <= W,
  };
}

export interface Advice {
  tone: 'ok' | 'warn' | 'info';
  text: string;
}

/** Балаға түсінікті ұсыныстар. */
export function adviceFor(a: ChildAnalysis, blocks: ChildBlock[]): Advice[] {
  const name = (id: string) => blocks.find((b) => b.id === id)?.title ?? '—';
  const out: Advice[] = [];
  out.push({ tone: 'info', text: `Барлық істер: ${a.sumExpr} = ${a.sum} минут. Уақыт: ${formatHM(a.windowStart)}–${formatHM(a.windowEnd)}, яғни ${a.window} минут.` });
  if (a.deficit > 0) out.push({ tone: 'warn', text: `Істерге ${a.sum} минут керек, ал уақыт ${a.window} минут. ${a.deficit} минут жетпейді. Бір істі қысқартайық.` });
  for (const o of a.overlaps) out.push({ tone: 'warn', text: `Екі іс бір уақытта жоспарланған: «${name(o.a)}» мен «${name(o.b)}» (${formatHM(o.start)}–${formatHM(o.end)}, ${o.minutes} минут). Біреуінің уақытын өзгертейік.` });
  for (const o of a.outside) out.push({ tone: 'warn', text: o.late ? `«${name(o.id)}» ${formatHM(a.windowEnd)}-ден кейін аяқталады: ${o.minutes} минуты уақытқа сыймай тұр.` : `«${name(o.id)}» ${formatHM(a.windowStart)}-ден бұрын басталады: ${o.minutes} минуты уақыттан тыс.` });
  if (a.deficit === 0) {
    if (a.free > 0) out.push({ tone: a.ok ? 'ok' : 'info', text: `Сенің жоспарыңда ${a.free} минут бос уақыт қалды.` });
    else out.push({ tone: 'info', text: 'Бос уақыт қалмады. Күтпеген іске резерв қалдырған дұрыс.' });
  }
  if (a.ok) out.push({ tone: 'ok', text: 'Жоспарың дұрыс: екі іс бір уақытта емес, бәрі уақытқа сыяды.' });
  return out;
}

export interface HelperSettings {
  reserveMin: number;
  breakMin: number;
  maxStudyBlock: number;
}
export const DEFAULT_HELPER_SETTINGS: HelperSettings = { reserveMin: 10, breakMin: 5, maxStudyBlock: 30 };

export function toSchedulerInput(blocks: ChildBlock[], windowStart: number, windowEnd: number, s: HelperSettings): SchedulerInput {
  return {
    windowStart,
    windowEnd,
    reserveMin: s.reserveMin,
    breakMin: s.breakMin,
    maxStudyBlock: s.maxStudyBlock,
    tasks: blocks.map((b) => ({
      id: b.id,
      title: b.title,
      kind: ACTIVITIES[b.activity].kind,
      duration: b.duration,
      priority: b.activity === 'homework' ? 1 : b.activity === 'screen' ? 3 : 2,
      fixed: b.fixed,
      fixedStart: b.fixed ? b.start : null,
    })),
  };
}

/** Баланың өз жоспары — уақыт сызығы үшін. */
export function childItems(blocks: ChildBlock[]): PlanItem[] {
  return blocks.filter((b) => b.duration > 0).map((b) => ({ id: `own-${b.id}`, taskId: b.id, title: b.title, kind: ACTIVITIES[b.activity].kind, start: b.start, end: b.start + b.duration, fixed: b.fixed }));
}

export function improveChildPlan(blocks: ChildBlock[], windowStart: number, windowEnd: number, s: HelperSettings = DEFAULT_HELPER_SETTINGS): ScheduleResult {
  return buildSchedule(toSchedulerInput(blocks, windowStart, windowEnd, s));
}

/** Әр өзгерістің балаға түсінікті себебі. */
export function explainChanges(blocks: ChildBlock[], a: ChildAnalysis, r: ScheduleResult): string[] {
  const out: string[] = [];
  const inOverlap = new Set(a.overlaps.flatMap((o) => [o.a, o.b]));
  const outside = new Set(a.outside.map((o) => o.id));
  for (const b of blocks.filter((x) => x.duration > 0)) {
    const items = r.items.filter((i) => i.taskId === b.id);
    const trimmed = r.trimmed.find((t) => t.taskId === b.id);
    const unplaced = r.unplaced.find((u) => u.taskId === b.id);
    if (b.fixed) {
      out.push(`«${b.title}» — міндетті іс, орны өзгерген жоқ (${formatHM(b.start)}).`);
      continue;
    }
    if (unplaced && items.length === 0) {
      out.push(`«${b.title}» бүгін сыймады: уақыт жетпейді. Оны басқа күнге қалдыруға болады.`);
      continue;
    }
    if (trimmed) out.push(`«${b.title}» ${trimmed.from} минуттан ${trimmed.to} минутқа қысқарды, себебі уақыт жетпеді.`);
    if (items.length > 1) out.push(`«${b.title}» ${items.length} бөлікке бөлінді (${items.map((i) => i.end - i.start).join(' + ')} мин), ортасында қысқа үзіліс бар — шаршамау үшін.`);
    const first = items[0];
    if (first && first.start !== b.start) {
      const why = inOverlap.has(b.id) ? 'басқа іспен бір уақытқа түспеуі үшін' : outside.has(b.id) ? 'уақытқа толық сыюы үшін' : b.activity === 'screen' ? 'экран маңызды істерден кейін тұруы үшін' : 'оқу мен жеңіл істер кезектесуі үшін';
      out.push(`«${b.title}» ${formatHM(b.start)} → ${formatHM(first.start)} жылжыды, ${why}.`);
    }
  }
  const br = r.items.filter((i) => i.kind === 'break').length;
  if (br) out.push(`Оқудан кейін ${br} рет қысқа үзіліс қойылды.`);
  const reserve = r.items.filter((i) => i.kind === 'reserve').reduce((s, i) => s + i.end - i.start, 0);
  out.push(`Соңында ${reserve} минут бос уақыт (резерв) қалды.`);
  return out;
}
