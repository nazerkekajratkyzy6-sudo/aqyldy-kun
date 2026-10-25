import { formatHM } from './time';

/**
 * 4-зертхана: детерминирленген алгоритмдік жоспарлаушы.
 * Бұл генеративті ЖИ ЕМЕС: бірдей кіріс әрқашан бірдей нәтиже береді,
 * әр шешімнің себебі мен математикалық тексеруі көрсетіледі.
 */
export type TaskKind = 'study' | 'reading' | 'movement' | 'rest' | 'screen' | 'other';
export type ItemKind = TaskKind | 'break' | 'reserve';

export const KIND_LABELS: Record<ItemKind, string> = {
  study: 'Оқу / үй тапсырмасы',
  reading: 'Кітап оқу',
  movement: 'Қозғалыс',
  rest: 'Демалыс',
  screen: 'Экран',
  other: 'Басқа',
  break: 'Үзіліс',
  reserve: 'Резерв / еркін уақыт',
};

export interface PlanTask {
  id: string;
  title: string;
  kind: TaskKind;
  duration: number;
  priority: 1 | 2 | 3;
  fixed: boolean;
  fixedStart?: number | null;
}

export interface SchedulerInput {
  windowStart: number;
  windowEnd: number;
  tasks: PlanTask[];
  reserveMin: number;
  breakMin: number;
  /** Бір оқу блогының ең ұзақ мәні (0 — бөлмеу) */
  maxStudyBlock: number;
}

export interface PlanItem {
  id: string;
  taskId: string | null;
  title: string;
  kind: ItemKind;
  start: number;
  end: number;
  fixed: boolean;
  part?: { index: number; total: number };
}

export interface Unplaced {
  taskId: string;
  title: string;
  minutes: number;
  reason: string;
}

export interface Trim {
  taskId: string;
  title: string;
  from: number;
  to: number;
}

export interface ScheduleResult {
  items: PlanItem[];
  unplaced: Unplaced[];
  trimmed: Trim[];
  reasons: string[];
  errors: string[];
  window: number;
  deficit: number;
}

const DEMANDING: TaskKind[] = ['study', 'reading'];
const LIGHT: TaskKind[] = ['movement', 'rest', 'other'];
const TRIMMABLE: TaskKind[] = ['screen', 'other'];

const dur = (i: { start: number; end: number }) => i.end - i.start;

interface Unit {
  task: PlanTask;
  minutes: number;
  part?: { index: number; total: number };
}

/** Санды мүмкіндігінше тең бөліктерге бөлу: 70, max 30 → [24, 23, 23] */
export function splitEvenly(total: number, maxPart: number): number[] {
  if (maxPart <= 0 || total <= maxPart) return [total];
  const n = Math.ceil(total / maxPart);
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function byPriority(a: { task: PlanTask; idx: number }, b: { task: PlanTask; idx: number }) {
  return a.task.priority - b.task.priority || a.idx - b.idx;
}

export function validateInput(input: SchedulerInput): string[] {
  const errors: string[] = [];
  const { windowStart: ws, windowEnd: we } = input;
  if (!(we > ws)) errors.push('Уақыт терезесінің соңы басынан кейін болуы керек.');
  if (input.reserveMin < 0 || input.breakMin < 0 || input.maxStudyBlock < 0) errors.push('Резерв, үзіліс және блок ұзақтығы теріс болмауы керек.');
  for (const t of input.tasks) {
    if (!Number.isFinite(t.duration) || t.duration < 0) errors.push(`«${t.title}»: ұзақтық теріс болмауы керек.`);
    if (t.fixed) {
      if (t.fixedStart === null || t.fixedStart === undefined || !Number.isFinite(t.fixedStart)) {
        errors.push(`«${t.title}» бекітілген, бірақ басталу уақыты берілмеген.`);
      } else if (t.fixedStart < ws || t.fixedStart + t.duration > we) {
        errors.push(`«${t.title}» (${formatHM(t.fixedStart)}–${formatHM(t.fixedStart + t.duration)}) уақыт терезесінен (${formatHM(ws)}–${formatHM(we)}) шығып тұр.`);
      }
    }
  }
  const fixed = input.tasks.filter((t) => t.fixed && t.duration > 0 && t.fixedStart != null);
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i];
      const b = fixed[j];
      const s = Math.max(a.fixedStart!, b.fixedStart!);
      const e = Math.min(a.fixedStart! + a.duration, b.fixedStart! + b.duration);
      if (e > s) errors.push(`Бекітілген «${a.title}» және «${b.title}» блоктары ${e - s} минутқа қабаттасады.`);
    }
  }
  return errors;
}

/** Алгоритмдік жоспар құру. */
export function buildSchedule(input: SchedulerInput): ScheduleResult {
  const { windowStart: ws, windowEnd: we, reserveMin, breakMin, maxStudyBlock } = input;
  const W = we - ws;
  const errors = validateInput(input);
  const reasons: string[] = [];
  if (errors.length) return { items: [], unplaced: [], trimmed: [], reasons, errors, window: Math.max(0, W), deficit: 0 };

  const fixedTasks = input.tasks.filter((t) => t.fixed && t.duration > 0);
  const fixedItems: PlanItem[] = fixedTasks.map((t) => ({
    id: `fx-${t.id}`,
    taskId: t.id,
    title: t.title,
    kind: t.kind,
    start: t.fixedStart!,
    end: t.fixedStart! + t.duration,
    fixed: true,
  }));
  if (fixedItems.length) {
    reasons.push(`Бекітілген блоктар орнынан қозғалмады: ${fixedItems.map((f) => `«${f.title}» ${formatHM(f.start)}–${formatHM(f.end)}`).join(', ')}.`);
  }
  const fixedSum = fixedItems.reduce((s, i) => s + dur(i), 0);

  // 1. Икемді тапсырмалардың көшірмесі (қысқартуға болатындай)
  const flex = input.tasks
    .map((task, idx) => ({ task: { ...task }, idx }))
    .filter((x) => !x.task.fixed && x.task.duration > 0);

  const buildSequence = (): Unit[] => {
    const demanding = flex.filter((x) => DEMANDING.includes(x.task.kind) && x.task.duration > 0).sort(byPriority);
    const light = flex.filter((x) => LIGHT.includes(x.task.kind) && x.task.duration > 0).sort(byPriority);
    const screen = flex.filter((x) => x.task.kind === 'screen' && x.task.duration > 0).sort(byPriority);
    const dUnits: Unit[] = [];
    for (const { task } of demanding) {
      const parts = task.kind === 'study' ? splitEvenly(task.duration, maxStudyBlock) : [task.duration];
      parts.forEach((m, i) => dUnits.push({ task, minutes: m, part: parts.length > 1 ? { index: i + 1, total: parts.length } : undefined }));
    }
    const lUnits: Unit[] = light.map(({ task }) => ({ task, minutes: task.duration }));
    const seq: Unit[] = [];
    let i = 0;
    let j = 0;
    while (i < dUnits.length || j < lUnits.length) {
      if (i < dUnits.length) seq.push(dUnits[i++]);
      if (j < lUnits.length) seq.push(lUnits[j++]);
    }
    for (const { task } of screen) seq.push({ task, minutes: task.duration });
    return seq;
  };

  const needsBreak = (seq: Unit[], k: number) => breakMin > 0 && seq[k].task.kind === 'study' && k < seq.length - 1;
  const totalNeed = (seq: Unit[]) => seq.reduce((s, u, k) => s + u.minutes + (needsBreak(seq, k) ? breakMin : 0), 0);

  // 2. Бюджетті тексеру: қажет ≤ W − бекітілген − резерв
  const available = W - fixedSum - reserveMin;
  let seq = buildSequence();
  const deficit0 = totalNeed(seq) - available;
  const trimmed: Trim[] = [];
  const unplaced: Unplaced[] = [];
  if (deficit0 > 0) {
    reasons.push(`Уақыт тапшы: қажет ${totalNeed(seq)} мин (үзілістермен), ал қолжетімді ${W} − ${fixedSum} − ${reserveMin} (резерв) = ${available} мин. Тапшылық: ${deficit0} мин.`);
    let remaining = deficit0;
    const trimOrder = flex
      .filter((x) => TRIMMABLE.includes(x.task.kind))
      .sort((a, b) => b.task.priority - a.task.priority || b.idx - a.idx);
    for (const x of trimOrder) {
      if (remaining <= 0) break;
      const cut = Math.min(x.task.duration, remaining);
      if (cut > 0) {
        trimmed.push({ taskId: x.task.id, title: x.task.title, from: x.task.duration, to: x.task.duration - cut });
        x.task.duration -= cut;
        remaining -= cut;
      }
    }
    for (const t of trimmed) reasons.push(`«${t.title}» ${t.from} → ${t.to} мин қысқартылды: икемді әрекет, басымдығы төмен.`);
    seq = buildSequence();
    let d = totalNeed(seq) - available;
    // Әлі де тапшы болса — ең төмен басымдықты бүтін тапсырмаларды шығару
    while (d > 0) {
      const candidates = flex.filter((x) => x.task.duration > 0).sort((a, b) => b.task.priority - a.task.priority || b.idx - a.idx);
      const victim = candidates[0];
      if (!victim) break;
      unplaced.push({ taskId: victim.task.id, title: victim.task.title, minutes: victim.task.duration, reason: `Резервті (${reserveMin} мин) сақтау үшін сыймады — ең төмен басымдық.` });
      victim.task.duration = 0;
      seq = buildSequence();
      d = totalNeed(seq) - available;
    }
  }

  // 3. Бос аралықтар (терезе минус бекітілгендер)
  const sortedFixed = [...fixedItems].sort((a, b) => a.start - b.start);
  const gaps: Array<{ start: number; end: number; cursor: number }> = [];
  let c = ws;
  for (const f of sortedFixed) {
    if (f.start > c) gaps.push({ start: c, end: f.start, cursor: c });
    c = Math.max(c, f.end);
  }
  if (c < we) gaps.push({ start: c, end: we, cursor: c });

  // 4. Орналастыру: әр бірлік — ең ерте сыятын бос орынға
  const placed: PlanItem[] = [];
  let breaksAdded = 0;
  seq.forEach((u, k) => {
    const withBreak = needsBreak(seq, k);
    const need = u.minutes + (withBreak ? breakMin : 0);
    let gap = gaps.find((g) => g.end - g.cursor >= need);
    let breakFits = withBreak;
    if (!gap && withBreak) {
      gap = gaps.find((g) => g.end - g.cursor >= u.minutes);
      breakFits = false;
    }
    if (!gap) {
      const prev = unplaced.find((x) => x.taskId === u.task.id);
      if (prev) prev.minutes += u.minutes;
      else unplaced.push({ taskId: u.task.id, title: u.task.title, minutes: u.minutes, reason: 'Бекітілген блоктар арасындағы бос аралықтардың ешқайсысына сыймады.' });
      return;
    }
    const title = u.part ? `${u.task.title} (${u.part.index}/${u.part.total})` : u.task.title;
    placed.push({ id: `it-${u.task.id}-${u.part?.index ?? 1}`, taskId: u.task.id, title, kind: u.task.kind, start: gap.cursor, end: gap.cursor + u.minutes, fixed: false, part: u.part });
    gap.cursor += u.minutes;
    if (breakFits) {
      placed.push({ id: `br-${u.task.id}-${u.part?.index ?? 1}`, taskId: null, title: 'Үзіліс', kind: 'break', start: gap.cursor, end: gap.cursor + breakMin, fixed: false });
      gap.cursor += breakMin;
      breaksAdded++;
    }
  });

  // 5. Қалған бос уақыт — резерв
  const reserveItems: PlanItem[] = gaps
    .filter((g) => g.end > g.cursor)
    .map((g, i) => ({ id: `rs-${i}`, taskId: null, title: 'Резерв / еркін уақыт', kind: 'reserve' as const, start: g.cursor, end: g.end, fixed: false }));

  const splitTasks = new Set(seq.filter((u) => u.part).map((u) => u.task.title));
  if (splitTasks.size) reasons.push(`Ұзақ оқу тапсырмалары қысқа блоктарға бөлінді (әр блок ≤ ${maxStudyBlock} мин): ${[...splitTasks].map((t) => `«${t}»`).join(', ')}.`);
  if (breaksAdded) reasons.push(`Әр оқу блогынан кейін ${breakMin} мин үзіліс қойылды (${breaksAdded} рет).`);
  if (seq.some((u) => DEMANDING.includes(u.task.kind)) && seq.some((u) => LIGHT.includes(u.task.kind))) {
    reasons.push('Ойлау жүктемесі бар әрекеттер (оқу, кітап) мен жеңіл әрекеттер (қозғалыс, демалыс) кезектестірілді; әр топ ішінде басымдығы жоғары әрекет бірінші тұр.');
  }
  if (seq.some((u) => u.task.kind === 'screen')) reasons.push('Экран уақыты міндетті әрекеттерден кейін, соңына қойылды.');
  const reserveTotal = reserveItems.reduce((s, i) => s + dur(i), 0);
  reasons.push(`Резерв: ${reserveTotal} мин (талап: кемінде ${reserveMin} мин).`);

  const items = [...fixedItems, ...placed, ...reserveItems].sort((a, b) => a.start - b.start || a.end - b.end);
  return { items, unplaced, trimmed, reasons, errors, window: W, deficit: Math.max(0, deficit0) };
}

/** «Дейін» нұсқасы: тапсырмалар берілген ретпен бірінен соң бірі қойылады (бекітілгендер өз орнында). */
export function naiveSchedule(input: SchedulerInput): PlanItem[] {
  const { windowStart: ws, windowEnd: we } = input;
  const items: PlanItem[] = [];
  let cursor = ws;
  for (const t of input.tasks) {
    if (t.duration <= 0) continue;
    if (t.fixed && t.fixedStart != null) {
      items.push({ id: `nv-${t.id}`, taskId: t.id, title: t.title, kind: t.kind, start: t.fixedStart, end: t.fixedStart + t.duration, fixed: true });
    } else {
      items.push({ id: `nv-${t.id}`, taskId: t.id, title: t.title, kind: t.kind, start: cursor, end: cursor + t.duration, fixed: false });
      cursor += t.duration;
    }
  }
  if (cursor < we) items.push({ id: 'nv-reserve', taskId: null, title: 'Резерв / еркін уақыт', kind: 'reserve', start: cursor, end: we, fixed: false });
  return items.sort((a, b) => a.start - b.start);
}

export interface ScheduleStats {
  conflicts: number;
  conflictMinutes: number;
  overflow: number;
  reserve: number;
  breaks: number;
  busy: number;
}

export function scheduleStats(items: PlanItem[], ws: number, we: number): ScheduleStats {
  let conflicts = 0;
  let conflictMinutes = 0;
  const real = items.filter((i) => i.kind !== 'reserve');
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      const s = Math.max(real[i].start, real[j].start);
      const e = Math.min(real[i].end, real[j].end);
      if (e > s) {
        conflicts++;
        conflictMinutes += e - s;
      }
    }
  }
  const overflow = items.reduce((s, i) => s + Math.max(0, i.end - we) - Math.min(0, i.start - ws), 0);
  return {
    conflicts,
    conflictMinutes,
    overflow,
    reserve: items.filter((i) => i.kind === 'reserve').reduce((s, i) => s + dur(i), 0),
    breaks: items.filter((i) => i.kind === 'break').reduce((s, i) => s + dur(i), 0),
    busy: real.filter((i) => i.kind !== 'break').reduce((s, i) => s + dur(i), 0),
  };
}

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

/** Құрылған жоспарды математикалық тексеру. */
export function verifySchedule(result: ScheduleResult, input: SchedulerInput): Check[] {
  const { windowStart: ws, windowEnd: we } = input;
  const W = we - ws;
  const items = result.items;
  const durations = items.map(dur);
  const total = durations.reduce((s, x) => s + x, 0);
  const st = scheduleStats(items, ws, we);
  const checks: Check[] = [];
  checks.push({
    id: 'sum',
    label: 'Барлық аралықтардың қосындысы терезеге тең',
    ok: total === W,
    detail: `${durations.join(' + ') || '0'} = ${total} мин; терезе ${formatHM(we)} − ${formatHM(ws)} = ${W} мин`,
  });
  checks.push({ id: 'overlap', label: 'Қабаттасу жоқ', ok: st.conflicts === 0, detail: st.conflicts ? `${st.conflicts} қабаттасу, ${st.conflictMinutes} мин` : 'Әр минутқа тек бір әрекет' });
  const outside = items.filter((i) => i.start < ws || i.end > we);
  checks.push({ id: 'window', label: 'Барлық блок терезе ішінде', ok: outside.length === 0, detail: outside.length ? outside.map((o) => o.title).join(', ') : `${formatHM(ws)}–${formatHM(we)}` });
  const fixedTasks = input.tasks.filter((t) => t.fixed && t.duration > 0);
  const fixedOk = fixedTasks.every((t) => items.some((i) => i.taskId === t.id && i.fixed && i.start === t.fixedStart && dur(i) === t.duration));
  checks.push({ id: 'fixed', label: 'Бекітілген блоктар сақталды', ok: fixedOk, detail: fixedTasks.length ? `${fixedTasks.length} бекітілген блок өз уақытында` : 'Бекітілген блок жоқ' });
  checks.push({ id: 'reserve', label: 'Резерв талапқа сай', ok: st.reserve >= input.reserveMin, detail: `${st.reserve} мин ≥ ${input.reserveMin} мин` });
  const taskRows = input.tasks
    .filter((t) => t.duration > 0)
    .map((t) => {
      const placed = items.filter((i) => i.taskId === t.id).reduce((s, i) => s + dur(i), 0);
      const tr = result.trimmed.find((x) => x.taskId === t.id);
      const un = result.unplaced.filter((x) => x.taskId === t.id).reduce((s, x) => s + x.minutes, 0);
      const expected = (tr ? tr.to : t.duration) - un;
      return { t, placed, expected, ok: placed === expected };
    });
  checks.push({
    id: 'tasks',
    label: 'Әр тапсырманың уақыты толық есептелді',
    ok: taskRows.every((r) => r.ok),
    detail: taskRows.map((r) => `${r.t.title}: ${r.placed}`).join('; ') || '—',
  });
  return checks;
}

export interface MoveRow {
  taskId: string;
  title: string;
  before: string;
  after: string;
  shift: number | null;
  reason: string;
}

/** «Дейін/кейін» әр тапсырма бойынша салыстыру. */
export function compareSchedules(before: PlanItem[], after: ScheduleResult, input: SchedulerInput): MoveRow[] {
  return input.tasks
    .filter((t) => t.duration > 0)
    .map((t) => {
      const b = before.find((i) => i.taskId === t.id);
      const a = after.items.filter((i) => i.taskId === t.id);
      const un = after.unplaced.find((u) => u.taskId === t.id);
      const tr = after.trimmed.find((x) => x.taskId === t.id);
      const beforeStr = b ? `${formatHM(b.start)}–${formatHM(b.end)}` : '—';
      const afterStr = a.length ? a.map((i) => `${formatHM(i.start)}–${formatHM(i.end)}`).join(', ') : '—';
      const shift = b && a.length ? a[0].start - b.start : null;
      let reason: string;
      if (t.fixed) reason = 'Бекітілген: орны өзгермейді.';
      else if (un && !a.length) reason = un.reason;
      else if (tr) reason = `${tr.from} → ${tr.to} мин қысқартылды (уақыт тапшылығы).`;
      else if (a.length > 1) reason = `${a.length} қысқа блокқа бөлінді, араларында үзіліс.`;
      else if (t.kind === 'screen') reason = 'Экран — міндетті істерден кейін.';
      else if (shift === 0) reason = 'Орны өзгермеді.';
      else if (DEMANDING.includes(t.kind)) reason = `Басымдық ${t.priority}: оқу әрекеттері жеңіл әрекеттермен кезектестірілді.`;
      else reason = 'Оқу блоктарының арасына жеңіл әрекет ретінде қойылды.';
      return { taskId: t.id, title: t.title, before: beforeStr, after: afterStr, shift, reason };
    });
}
