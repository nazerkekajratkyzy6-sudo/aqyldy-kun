import { MINUTES_PER_DAY, sanitizeMinutes } from './time';

/** 1-зертхана: тәуліктің 1440 минутын әрекеттерге бөлу моделі. */
export interface Activity {
  id: string;
  name: string;
  minutes: number;
  /** Пайдалы уақыт (оқу, жеке даму) — K коэффициентіне кіреді */
  useful: boolean;
  color: string;
}

export interface BudgetSummary {
  total: number; // ΣTi
  remainder: number; // R = 1440 − ΣTi
  percents: Record<string, number>; // Ti / 1440 × 100
  usefulTotal: number;
  efficiencyK: number; // K = пайдалы / 1440 × 100
  valid: boolean;
}

export function sumMinutes(list: Activity[]): number {
  return list.reduce((s, a) => s + a.minutes, 0);
}

export function summarize(list: Activity[], available = MINUTES_PER_DAY): BudgetSummary {
  const total = sumMinutes(list);
  const percents: Record<string, number> = {};
  for (const a of list) percents[a.id] = available > 0 ? (a.minutes / available) * 100 : 0;
  const usefulTotal = list.filter((a) => a.useful).reduce((s, a) => s + a.minutes, 0);
  return {
    total,
    remainder: available - total,
    percents,
    usefulTotal,
    efficiencyK: available > 0 ? (usefulTotal / available) * 100 : 0,
    valid: total <= available && list.every((a) => a.minutes >= 0),
  };
}

export interface SetResult {
  list: Activity[];
  /** Мән шектелген болса — себебі */
  clamped: null | 'negative' | 'overflow';
  applied: number;
  max: number;
}

/**
 * Бір әрекеттің уақытын өзгертеді. Басқа әрекеттер автоматты түрде өзгермейді.
 * Теріс мән 0-ге, тәуліктен асатын мән (1440 − басқалар) шегіне дейін шектеледі.
 */
export function setActivityMinutes(list: Activity[], id: string, raw: number, available = MINUTES_PER_DAY): SetResult {
  const others = list.filter((a) => a.id !== id).reduce((s, a) => s + a.minutes, 0);
  const max = Math.max(0, available - others);
  let clamped: SetResult['clamped'] = null;
  let value: number;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    value = 0;
    clamped = raw < 0 ? 'negative' : null;
  } else {
    value = sanitizeMinutes(raw);
  }
  if (value > max) {
    value = max;
    clamped = 'overflow';
  }
  return {
    list: list.map((a) => (a.id === id ? { ...a, minutes: value } : a)),
    clamped,
    applied: value,
    max,
  };
}

/** Тиімділік коэффициенті K = (пайдалы уақыт / қолжетімді уақыт) × 100% (шартты көрсеткіш). */
export function efficiencyK(useful: number, available: number): number | null {
  if (available <= 0) return null;
  return (useful / available) * 100;
}
