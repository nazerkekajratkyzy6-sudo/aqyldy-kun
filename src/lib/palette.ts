import type { Category } from '../core/intervals';
import type { Metric } from '../core/diary';
import type { ItemKind } from '../core/scheduler';

/**
 * Түстер нысанға бекітілген (рет бойынша емес). Категориялық реттілік
 * CVD-валидатормен тексерілген: #2563EB, #D97706, #0D9488, #E11D48, #7C3AED, #65A30D, #0891B2, #EA580C.
 */
export const C = {
  blue: '#2563EB',
  amber: '#D97706',
  teal: '#0D9488',
  rose: '#E11D48',
  violet: '#7C3AED',
  green: '#65A30D',
  cyan: '#0891B2',
  orange: '#EA580C',
  slate: '#64748B',
  slateLight: '#A3B1C2',
  grid: '#E3E9F1',
  axis: '#6B7A90',
  ink: '#17263C',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  sleep: C.violet,
  morning: C.slateLight,
  school: C.blue,
  food: C.orange,
  rest: C.teal,
  homework: C.amber,
  movement: C.green,
  reading: C.cyan,
  screen: C.rose,
  free: C.slate,
  other: '#94A3B8',
};

export const METRIC_COLORS: Record<Metric, string> = {
  homework: C.amber,
  screen: C.rose,
  reading: C.cyan,
  movement: C.green,
  unplanned: C.violet,
};

export const KIND_COLORS: Record<ItemKind, string> = {
  study: C.amber,
  reading: C.cyan,
  movement: C.green,
  rest: C.teal,
  screen: C.rose,
  other: C.slate,
  break: '#CBD5E1',
  reserve: '#E3E9F1',
};

export const PLAN_COLOR = C.slateLight;
export const FACT_COLOR = C.blue;
