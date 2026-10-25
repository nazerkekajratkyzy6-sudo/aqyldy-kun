import { METRICS, METRIC_LABELS, averages, comparePeriodsByMetric, firstLastChange, mixedDayTypes, planFactRows, sortByDate, splitPeriods, type DiaryEntry, type Metric } from '../core/diary';
import { describeChange, type PeriodComparison, comparePeriods } from '../core/stats';
import { fmtDate } from '../core/format';
import { sampleDayLabel } from '../data/research';

export type CompareMethod = 'firstLast' | 'halves' | 'phase';
export const METHOD_LABELS: Record<CompareMethod, string> = {
  firstLast: '1-күн ↔ соңғы күн',
  halves: 'Алғашқы ↔ соңғы жартысы',
  phase: 'Өз бетімен ↔ көмекшімен',
};

export const dayLabel = (e: DiaryEntry) => (e.id.startsWith('sample-') ? sampleDayLabel(e.id) : fmtDate(e.date));

export interface AnalyticsResult {
  n: number;
  entries: DiaryEntry[];
  avg: Record<Metric, number | null>;
  byDay: Array<Record<string, number | string>>;
  planFact: ReturnType<typeof planFactRows>;
  compare: { method: CompareMethod; labelA: string; labelB: string; byMetric: Record<Metric, PeriodComparison>; sentences: string[]; available: boolean; reason?: string };
  mixed: boolean;
  firstLast: Record<Metric, ReturnType<typeof firstLastChange>>;
}

export function computeAnalytics(raw: DiaryEntry[], method: CompareMethod): AnalyticsResult {
  const entries = sortByDate(raw);
  const n = entries.length;
  const avg = averages(entries);
  const byDay = entries.map((e) => ({ day: dayLabel(e), ...Object.fromEntries(METRICS.map((m) => [m, e.fact[m]])) }));
  const fl = Object.fromEntries(METRICS.map((m) => [m, firstLastChange(entries, m)])) as Record<Metric, ReturnType<typeof firstLastChange>>;

  let labelA = '';
  let labelB = '';
  let byMetric: Record<Metric, PeriodComparison>;
  let available = true;
  let reason: string | undefined;
  let groupA: DiaryEntry[] = [];
  let groupB: DiaryEntry[] = [];
  if (method === 'firstLast') {
    labelA = n ? dayLabel(entries[0]) : '—';
    labelB = n ? dayLabel(entries[n - 1]) : '—';
    groupA = n >= 2 ? [entries[0]] : [];
    groupB = n >= 2 ? [entries[n - 1]] : [];
    byMetric = Object.fromEntries(METRICS.map((m) => [m, comparePeriods(groupA.map((e) => e.fact[m]), groupB.map((e) => e.fact[m]))])) as Record<Metric, PeriodComparison>;
    if (n < 2) {
      available = false;
      reason = 'Салыстыру үшін кемінде 2 күн қажет.';
    }
  } else {
    const p = splitPeriods(entries, method);
    labelA = p.labelA;
    labelB = p.labelB;
    groupA = p.a;
    groupB = p.b;
    byMetric = comparePeriodsByMetric(p.a, p.b);
    if (!p.a.length || !p.b.length) {
      available = false;
      reason = method === 'phase' ? 'Екі кезеңнің де жазбалары қажет: «Өз бетімен» және «Көмекшімен» деп белгіленген күндер.' : 'Салыстыру үшін кемінде 2 күн қажет.';
    }
  }
  const sentences = available ? METRICS.map((m) => describeChange(METRIC_LABELS[m], byMetric[m])) : [];
  const mixed = mixedDayTypes([...groupA, ...groupB]);
  return { n, entries, avg, byDay, planFact: planFactRows(entries), compare: { method, labelA, labelB, byMetric, sentences, available, reason }, mixed, firstLast: fl };
}

/** Сақ қорытынды мәтіні. Дерек жоқ болса — тұжырым жоқ. */
export function cautiousConclusion(a: AnalyticsResult, demo: boolean): string[] {
  if (a.n === 0) return ['Деректер жоқ — ешқандай тұжырым жасалмайды.'];
  const out: string[] = [];
  if (demo) out.push('Төмендегі нәтижелер — зерттеу жұмысының ҮЛГІ деректері бойынша есептелген; олар нақты бақылау нәтижесі емес.');
  if (!a.compare.available) out.push(`Кезеңдерді салыстыру жүргізілмеді: ${a.compare.reason}`);
  else out.push(...a.compare.sentences);
  if (a.mixed) out.push('Ескерту: салыстырылатын кезеңдерде оқу және демалыс күндері араласқан — бұл айырманың бір себебі болуы мүмкін.');
  out.push(`Бақылау: ${a.n} күн, бір оқушы. Бұл нәтиже ЖИ-дің немесе модельдің әмбебап тиімділігін дәлелдемейді; оқу үлгерімі мен денсаулыққа әсері бөлек тексеруді қажет етеді.`);
  return out;
}
