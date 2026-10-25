import { z } from 'zod';
import { MINUTES_PER_DAY } from './time';
import { comparePeriods, mean, percentChange, type PeriodComparison } from './stats';

/** 6-зертхана: зерттеу күнделігі. */
export const METRICS = ['homework', 'screen', 'reading', 'movement', 'unplanned'] as const;
export type Metric = (typeof METRICS)[number];
export const PLAN_METRICS = ['homework', 'screen', 'reading', 'movement'] as const;
export type PlanMetric = (typeof PLAN_METRICS)[number];

export const METRIC_LABELS: Record<Metric, string> = {
  homework: 'Үй тапсырмасы',
  screen: 'Экран',
  reading: 'Кітап оқу',
  movement: 'Қозғалыс',
  unplanned: 'Жоспардан тыс',
};

const minutes = z.number().int().min(0).max(MINUTES_PER_DAY);
const optMinutes = minutes.nullable();

export const DiaryEntrySchema = z
  .object({
    id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Күн пішімі: ЖЖЖЖ-АА-КК'),
    dayType: z.enum(['school', 'weekend']),
    phase: z.enum(['self', 'assistant', 'none']),
    plan: z.object({ homework: optMinutes, screen: optMinutes, reading: optMinutes, movement: optMinutes }),
    fact: z.object({ homework: minutes, screen: minutes, reading: minutes, movement: minutes, unplanned: minutes }),
    comment: z.string().max(1000),
  })
  .refine((e) => METRICS.reduce((s, m) => s + e.fact[m], 0) <= MINUTES_PER_DAY, { message: 'Нақты уақыттардың қосындысы 1440 минуттан аспауы керек' });

export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;

export const DiaryExportSchema = z.object({
  app: z.literal('aqyldy-kun'),
  kind: z.literal('diary'),
  version: z.literal(1),
  exportedAt: z.string(),
  entries: z.array(DiaryEntrySchema),
});
export type DiaryExport = z.infer<typeof DiaryExportSchema>;

export function makeExport(entries: DiaryEntry[], now = new Date()): DiaryExport {
  return { app: 'aqyldy-kun', kind: 'diary', version: 1, exportedAt: now.toISOString(), entries };
}

export interface ImportResult {
  ok: boolean;
  entries: DiaryEntry[];
  error?: string;
}

export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, entries: [], error: 'Файл JSON пішімінде емес.' };
  }
  const r = DiaryExportSchema.safeParse(raw);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, entries: [], error: `Файл құрылымы сәйкес емес: ${issue?.path.join('.') || '—'} — ${issue?.message ?? ''}` };
  }
  const dates = new Set<string>();
  for (const e of r.data.entries) {
    if (dates.has(e.date)) return { ok: false, entries: [], error: `Бір күн (${e.date}) екі рет жазылған.` };
    dates.add(e.date);
  }
  return { ok: true, entries: r.data.entries };
}

export function sortByDate(entries: DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function metricValues(entries: DiaryEntry[], m: Metric): number[] {
  return sortByDate(entries).map((e) => e.fact[m]);
}

export function averages(entries: DiaryEntry[]): Record<Metric, number | null> {
  return Object.fromEntries(METRICS.map((m) => [m, mean(entries.map((e) => e.fact[m]))])) as Record<Metric, number | null>;
}

/** Жоспар/факт айырмасы Δ = факт − жоспар (жоспар берілген күндер ғана). */
export function planFactRows(entries: DiaryEntry[]) {
  return sortByDate(entries).flatMap((e) =>
    PLAN_METRICS.filter((m) => e.plan[m] !== null).map((m) => ({ date: e.date, metric: m, plan: e.plan[m] as number, fact: e.fact[m], delta: e.fact[m] - (e.plan[m] as number) })),
  );
}

/** Бірінші және соңғы күн бойынша өзгеріс (зерттеу жұмысындағы әдіс). */
export function firstLastChange(entries: DiaryEntry[], m: Metric) {
  const s = sortByDate(entries);
  if (s.length < 2) return null;
  const a = s[0].fact[m];
  const b = s[s.length - 1].fact[m];
  return { first: a, last: b, diff: b - a, pct: percentChange(a, b) };
}

export type PeriodSplit = 'halves' | 'phase';

export function splitPeriods(entries: DiaryEntry[], how: PeriodSplit): { a: DiaryEntry[]; b: DiaryEntry[]; labelA: string; labelB: string } {
  const s = sortByDate(entries);
  if (how === 'phase') {
    return { a: s.filter((e) => e.phase === 'self'), b: s.filter((e) => e.phase === 'assistant'), labelA: 'Өз бетімен жоспарлау', labelB: 'Көмекшімен жоспарлау' };
  }
  const half = Math.floor(s.length / 2);
  return { a: s.slice(0, half), b: s.slice(s.length - half), labelA: `Алғашқы ${half} күн`, labelB: `Соңғы ${half} күн` };
}

export function comparePeriodsByMetric(a: DiaryEntry[], b: DiaryEntry[]): Record<Metric, PeriodComparison> {
  return Object.fromEntries(METRICS.map((m) => [m, comparePeriods(a.map((e) => e.fact[m]), b.map((e) => e.fact[m]))])) as Record<Metric, PeriodComparison>;
}

/** Оқу және демалыс күндері араласқанын анықтау. */
export function mixedDayTypes(entries: DiaryEntry[]): boolean {
  return new Set(entries.map((e) => e.dayType)).size > 1;
}

export function emptyEntry(id: string, date: string): DiaryEntry {
  return {
    id,
    date,
    dayType: 'school',
    phase: 'none',
    plan: { homework: null, screen: null, reading: null, movement: null },
    fact: { homework: 0, screen: 0, reading: 0, movement: 0, unplanned: 0 },
    comment: '',
  };
}
