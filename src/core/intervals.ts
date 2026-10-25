import { MINUTES_PER_DAY, durationBetween, formatHM, formatDuration } from './time';

/** 2-зертхана: күн жоспарының блоктары және оларды талдау. */
export type Category = 'sleep' | 'school' | 'homework' | 'food' | 'rest' | 'movement' | 'reading' | 'screen' | 'morning' | 'free' | 'other';

export const CATEGORY_LABELS: Record<Category, string> = {
  sleep: 'Ұйқы',
  school: 'Мектеп',
  homework: 'Үй тапсырмасы',
  food: 'Тамақ',
  rest: 'Демалыс',
  movement: 'Қозғалыс',
  reading: 'Кітап оқу',
  screen: 'Экран',
  morning: 'Таңғы дайындық',
  free: 'Еркін уақыт',
  other: 'Басқа',
};

export interface Block {
  id: string;
  title: string;
  category: Category;
  start: number; // минут, 0..1439
  end: number; // минут, 0..1440; end < start болса — түн ортасынан өтеді
  priority: 1 | 2 | 3; // 1 — жоғары
  fixed: boolean;
}

export type Segment = [number, number];

export function blockDuration(b: Block): number {
  return b.start === b.end ? 0 : durationBetween(b.start, b.end);
}

/** Блокты [0, 1440) аралығындағы бөліктерге бөлу (түн ортасы ескеріледі). */
export function blockSegments(b: Block): Segment[] {
  if (b.start === b.end) return [];
  if (b.end > b.start) return [[b.start, Math.min(b.end, MINUTES_PER_DAY)]];
  return [
    [b.start, MINUTES_PER_DAY],
    [0, b.end],
  ].filter(([s, e]) => e > s) as Segment[];
}

export interface PlanIssue {
  blockId: string;
  code: 'zero' | 'range' | 'title';
  message: string;
}

export interface Overlap {
  a: string;
  b: string;
  start: number;
  end: number;
  minutes: number;
}

export interface Gap {
  start: number;
  end: number;
  minutes: number;
}

export interface PlanAnalysis {
  errors: PlanIssue[];
  overlaps: Overlap[];
  gaps: Gap[];
  midnight: string[];
  scheduledSum: number; // Σ блок ұзақтықтары
  coveredMinutes: number; // кемінде бір блок жабатын минуттар
  uncoveredMinutes: number; // 1440 − covered
  overlapMinutes: number;
  ok: boolean;
}

/** Бірнеше аралықтың бірігуін есептеу. */
export function mergeSegments(segs: Segment[]): Segment[] {
  const sorted = [...segs].filter(([s, e]) => e > s).sort((x, y) => x[0] - y[0]);
  const out: Segment[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export function analyzePlan(blocks: Block[]): PlanAnalysis {
  const errors: PlanIssue[] = [];
  const midnight: string[] = [];
  for (const b of blocks) {
    if (!b.title.trim()) errors.push({ blockId: b.id, code: 'title', message: 'Блоктың атауы жоқ' });
    if (!Number.isFinite(b.start) || !Number.isFinite(b.end) || b.start < 0 || b.start >= MINUTES_PER_DAY || b.end < 0 || b.end > MINUTES_PER_DAY) {
      errors.push({ blockId: b.id, code: 'range', message: 'Уақыт 00:00–24:00 аралығынан тыс' });
      continue;
    }
    if (b.start === b.end) errors.push({ blockId: b.id, code: 'zero', message: 'Басталу мен аяқталу уақыты бірдей: ұзақтық 0 минут' });
    if (b.end < b.start) midnight.push(b.id);
  }

  const valid = blocks.filter((b) => !errors.some((e) => e.blockId === b.id && e.code === 'range'));
  const overlaps: Overlap[] = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      for (const [s1, e1] of blockSegments(valid[i])) {
        for (const [s2, e2] of blockSegments(valid[j])) {
          const s = Math.max(s1, s2);
          const e = Math.min(e1, e2);
          if (e > s) overlaps.push({ a: valid[i].id, b: valid[j].id, start: s, end: e, minutes: e - s });
        }
      }
    }
  }

  const merged = mergeSegments(valid.flatMap(blockSegments));
  const covered = merged.reduce((s, [a, b]) => s + (b - a), 0);
  const gaps: Gap[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) gaps.push({ start: cursor, end: s, minutes: s - cursor });
    cursor = Math.max(cursor, e);
  }
  if (cursor < MINUTES_PER_DAY) gaps.push({ start: cursor, end: MINUTES_PER_DAY, minutes: MINUTES_PER_DAY - cursor });
  // Түн ортасы арқылы өтетін бос аралықты (мыс. 23:00–24:00 және 00:00–06:00) біріктіру
  if (gaps.length >= 2 && gaps[0].start === 0 && gaps[gaps.length - 1].end === MINUTES_PER_DAY) {
    const first = gaps.shift()!;
    const last = gaps.pop()!;
    gaps.push({ start: last.start, end: first.end, minutes: last.minutes + first.minutes });
  }

  const scheduledSum = valid.reduce((s, b) => s + blockDuration(b), 0);
  return {
    errors,
    overlaps,
    gaps,
    midnight,
    scheduledSum,
    coveredMinutes: covered,
    uncoveredMinutes: MINUTES_PER_DAY - covered,
    overlapMinutes: overlaps.reduce((s, o) => s + o.minutes, 0),
    ok: errors.length === 0 && overlaps.length === 0,
  };
}

export function categoryTotals(blocks: Block[]): Record<Category, number> {
  const t = Object.fromEntries(Object.keys(CATEGORY_LABELS).map((k) => [k, 0])) as Record<Category, number>;
  for (const b of blocks) t[b.category] += blockDuration(b);
  return t;
}

export interface PlanDifference {
  kind: 'category' | 'shift' | 'duration' | 'onlyA' | 'onlyB';
  label: string;
  minutes: number;
  explanation: string;
}

const norm = (s: string) => s.trim().toLocaleLowerCase('kk-KZ');

/** Екі жоспарды салыстыру және әр айырманы түсіндіру. */
export function comparePlans(a: Block[], b: Block[], nameA = 'А жоспары', nameB = 'Ә жоспары'): PlanDifference[] {
  const diffs: PlanDifference[] = [];
  const ta = categoryTotals(a);
  const tb = categoryTotals(b);
  for (const cat of Object.keys(CATEGORY_LABELS) as Category[]) {
    const d = tb[cat] - ta[cat];
    if (d !== 0) {
      diffs.push({
        kind: 'category',
        label: CATEGORY_LABELS[cat],
        minutes: d,
        explanation: `«${CATEGORY_LABELS[cat]}» санатына ${nameA} бойынша ${ta[cat]} мин, ${nameB} бойынша ${tb[cat]} мин бөлінген. Айырма: ${tb[cat]} − ${ta[cat]} = ${d > 0 ? '+' : ''}${d} мин.`,
      });
    }
  }
  const usedB = new Set<string>();
  for (const x of a) {
    const y = b.find((c) => !usedB.has(c.id) && norm(c.title) === norm(x.title));
    if (!y) {
      diffs.push({ kind: 'onlyA', label: x.title, minutes: -blockDuration(x), explanation: `«${x.title}» (${formatHM(x.start)}–${formatHM(x.end)}) тек ${nameA} ішінде бар; ${nameB} ішінде бұл блок жоқ.` });
      continue;
    }
    usedB.add(y.id);
    const dx = blockDuration(x);
    const dy = blockDuration(y);
    if (x.start !== y.start) {
      const shift = y.start - x.start;
      diffs.push({
        kind: 'shift',
        label: x.title,
        minutes: shift,
        explanation: `«${x.title}» басталу уақыты ${formatHM(x.start)} → ${formatHM(y.start)}: ${shift > 0 ? 'кейін' : 'ертерек'} ${formatDuration(Math.abs(shift))} жылжыған.`,
      });
    }
    if (dx !== dy) {
      diffs.push({
        kind: 'duration',
        label: x.title,
        minutes: dy - dx,
        explanation: `«${x.title}» ұзақтығы ${dx} мин → ${dy} мин: ${dy - dx > 0 ? '+' : ''}${dy - dx} мин.`,
      });
    }
  }
  for (const y of b) {
    if (!usedB.has(y.id)) {
      diffs.push({ kind: 'onlyB', label: y.title, minutes: blockDuration(y), explanation: `«${y.title}» (${formatHM(y.start)}–${formatHM(y.end)}) тек ${nameB} ішінде бар; ${nameA} ішінде мұндай блок жоқ.` });
    }
  }
  return diffs;
}

/** Блокты d минутқа жылжыту; ұзақтық сақталады, қажет болса түн ортасынан өтеді. */
export function shiftBlock(b: Block, d: number): Block {
  const len = blockDuration(b);
  const start = (((b.start + d) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  let end = start + len;
  if (end > MINUTES_PER_DAY) end -= MINUTES_PER_DAY;
  return { ...b, start, end };
}
