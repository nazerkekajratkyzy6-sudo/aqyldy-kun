import { KIND_LABELS, type PlanItem } from '../core/scheduler';
import { formatHM } from '../core/time';

/**
 * Міндетті емес серверлік кеңейту. Браузерден тек жасырын (анонимді) дерек жіберіледі:
 * әрекет түрі мен минуттар. Атаулар, аты-жөн, күн, түсініктеме ЖІБЕРІЛМЕЙДІ.
 * API кілті тек серверде (Vercel Environment Variables) сақталады.
 */
export interface LlmResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export function anonymize(items: PlanItem[]) {
  return items.map((i) => ({ kind: i.kind, label: KIND_LABELS[i.kind], start: formatHM(i.start), end: formatHM(i.end), minutes: i.end - i.start, fixed: i.fixed }));
}

export async function askExplanation(items: PlanItem[], windowStart: number, windowEnd: number, signal?: AbortSignal): Promise<LlmResult> {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ window: { start: formatHM(windowStart), end: formatHM(windowEnd), minutes: windowEnd - windowStart }, items: anonymize(items) }),
      signal,
    });
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return { ok: false, error: 'Серверлік тілдік модель қосылмаған (API табылмады).' };
    const data = (await res.json()) as { text?: string; error?: string; available?: boolean };
    if (data.available === false) return { ok: false, error: data.error };
    if (!res.ok) return { ok: false, error: data.error ?? `Сервер қатесі (${res.status}).` };
    return { ok: true, text: data.text ?? '' };
  } catch {
    return { ok: false, error: 'Серверге қосылу мүмкін болмады.' };
  }
}
