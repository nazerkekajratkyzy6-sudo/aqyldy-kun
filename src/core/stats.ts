/** Статистика: орташа мән, айырма, пайыздық өзгеріс. */

/** M = Σxᵢ / n. Дерек жоқ болса — null. */
export function mean(xs: Array<number | null | undefined>): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (v.length === 0) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

export function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0);
}

/** Δ = факт − жоспар */
export function delta(fact: number, plan: number): number {
  return fact - plan;
}

/** P = (B − A) / A × 100%. A = 0 болса, анықталмаған (null). */
export function percentChange(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return ((b - a) / a) * 100;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export interface PeriodComparison {
  nA: number;
  nB: number;
  meanA: number | null;
  meanB: number | null;
  diff: number | null; // meanB − meanA
  pct: number | null;
  sufficient: boolean;
}

/** Екі кезеңнің орташа мәндерін салыстыру. Екі кезеңде де дерек болуы шарт. */
export function comparePeriods(a: Array<number | null | undefined>, b: Array<number | null | undefined>): PeriodComparison {
  const va = a.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const vb = b.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const meanA = mean(va);
  const meanB = mean(vb);
  const sufficient = va.length > 0 && vb.length > 0;
  return {
    nA: va.length,
    nB: vb.length,
    meanA,
    meanB,
    diff: sufficient ? meanB! - meanA! : null,
    pct: sufficient ? percentChange(meanA!, meanB!) : null,
    sufficient,
  };
}

/**
 * Өзгерісті сақ түрде сипаттау. Дерек жоқ болса — ешқандай тұжырым жасалмайды.
 * "Жақсарды" деген баға берілмейді: тек сандық өзгеріс сипатталады.
 */
export function describeChange(metricLabel: string, c: PeriodComparison, unit = 'мин'): string {
  if (!c.sufficient || c.meanA === null || c.meanB === null || c.diff === null) {
    return `«${metricLabel}»: салыстыруға дерек жеткіліксіз — қорытынды жасалмайды.`;
  }
  const a = round1(c.meanA);
  const b = round1(c.meanB);
  const d = round1(Math.abs(c.diff));
  const pct = c.pct === null ? 'пайыздық өзгерісті есептеу мүмкін емес (A = 0)' : `${round1(Math.abs(c.pct)).toString().replace('.', ',')}%`;
  const small = c.nA < 3 || c.nB < 3 ? ' Бақылау күндері аз, сондықтан бұл тек бағыт көрсетеді.' : '';
  if (c.diff === 0) return `«${metricLabel}»: орташа мән өзгермеген (${a} ${unit}).${small}`;
  const verb = c.diff < 0 ? 'азайған' : 'артқан';
  const fmt = (x: number) => String(x).replace('.', ',');
  return `«${metricLabel}»: орташа мән ${fmt(a)} ${unit} → ${fmt(b)} ${unit}; айырма ${c.diff < 0 ? '−' : '+'}${fmt(d)} ${unit}, яғни ${verb} (${pct}).${small}`;
}
