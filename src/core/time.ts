/** Уақыт бірліктерімен жұмыс: барлық есептеу минутпен жүргізіледі. */

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
/** 1 тәулік = 24 × 60 = 1440 минут */
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

/** "16:45" → 1005. Қате пішім болса null. "24:00" → 1440 (тәулік соңы). */
export function parseHM(value: string): number | null {
  const m = /^\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) return null;
  if (h === 24 && min === 0) return MINUTES_PER_DAY;
  if (h > 23) return null;
  return h * MINUTES_PER_HOUR + min;
}

/** 1005 → "16:45". Тәуліктен асса, қалдықпен (mod 1440) көрсетіледі. */
export function formatHM(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / MINUTES_PER_HOUR);
  const mm = m % MINUTES_PER_HOUR;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Басталуы мен аяқталуы арасындағы ұзақтық. Түн ортасынан өтсе, +1440 қосылады. */
export function durationBetween(start: number, end: number): number {
  if (end >= start) return end - start;
  return end + MINUTES_PER_DAY - start;
}

export function crossesMidnight(start: number, end: number): boolean {
  return end < start;
}

/** 135 → { hours: 2, minutes: 15 } */
export function splitHM(totalMinutes: number): { hours: number; minutes: number } {
  const t = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(t / MINUTES_PER_HOUR), minutes: t % MINUTES_PER_HOUR };
}

/** Сағат пен минутты минутқа айналдыру: 1 сағ 15 мин → 75 */
export function toMinutes(hours: number, minutes: number): number {
  return hours * MINUTES_PER_HOUR + minutes;
}

/** 135 → "2 сағ 15 мин", 45 → "45 мин", 120 → "2 сағ" */
export function formatDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '−' : '';
  const { hours, minutes } = splitHM(Math.abs(totalMinutes));
  if (hours === 0) return `${sign}${minutes} мин`;
  if (minutes === 0) return `${sign}${hours} сағ`;
  return `${sign}${hours} сағ ${minutes} мин`;
}

/** Минутты сағатқа (ондық бөлшек): 45 → 0.75 */
export function minutesToHours(totalMinutes: number): number {
  return totalMinutes / MINUTES_PER_HOUR;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Енгізілген мәнді бүтін, теріс емес минутқа келтіру. */
export function sanitizeMinutes(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
