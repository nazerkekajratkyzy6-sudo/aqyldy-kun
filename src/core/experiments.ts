import { percentChange } from './stats';

/** 3-зертхана эксперименттерінің таза математикалық функциялары. */

/** 1-эксперимент: экран уақыты және қалған уақыт. R = W − ΣT − S */
export function screenRemainder(window: number, otherTasks: number[], screen: number) {
  const tasks = otherTasks.reduce((s, x) => s + x, 0);
  const remainder = window - tasks - screen;
  return { tasks, remainder, deficit: remainder < 0 ? -remainder : 0, maxScreen: Math.max(0, window - tasks) };
}

/** Экран уақыты өзгергенде R қалай өзгеретінінің қатары (график үшін). */
export function screenSeries(window: number, otherTasks: number[], step = 10) {
  const tasks = otherTasks.reduce((s, x) => s + x, 0);
  const out: Array<{ screen: number; remainder: number }> = [];
  for (let s = 0; s <= window; s += step) out.push({ screen: s, remainder: window - tasks - s });
  return out;
}

/** 2-эксперимент: кітап, үй тапсырмасы, демалыс және қозғалыс; резерв және K. */
export function distribution(window: number, parts: Record<string, number>, usefulKeys: string[]) {
  const used = Object.values(parts).reduce((s, x) => s + x, 0);
  const reserve = window - used;
  const useful = usefulKeys.reduce((s, k) => s + (parts[k] ?? 0), 0);
  const shares = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, window > 0 ? (v / window) * 100 : 0]));
  return { used, reserve, useful, k: window > 0 ? (useful / window) * 100 : null, shares, valid: reserve >= 0 };
}

/** 3-эксперимент: жоспар мен факт. Δ = факт − жоспар */
export function planFact(rows: Array<{ id: string; label: string; plan: number; fact: number }>) {
  const out = rows.map((r) => ({ ...r, delta: r.fact - r.plan, pct: percentChange(r.plan, r.fact) }));
  const planSum = rows.reduce((s, r) => s + r.plan, 0);
  const factSum = rows.reduce((s, r) => s + r.fact, 0);
  const biggest = out.reduce<(typeof out)[number] | null>((m, r) => (m === null || Math.abs(r.delta) > Math.abs(m.delta) ? r : m), null);
  const absDev = out.reduce((s, r) => s + Math.abs(r.delta), 0);
  return { rows: out, planSum, factSum, totalDelta: factSum - planSum, biggest, absDev };
}

/** 4-эксперимент: уақыт тапшылығы. D = ΣT − W (D > 0 болса — тапшылық). */
export function timeDeficit(window: number, items: Array<{ id: string; label: string; minutes: number; priority: number; flexible: boolean }>) {
  const need = items.reduce((s, x) => s + x.minutes, 0);
  const deficit = need - window;
  const plan: Array<{ id: string; label: string; cut: number }> = [];
  if (deficit > 0) {
    let rest = deficit;
    const order = [...items].filter((x) => x.flexible).sort((a, b) => b.priority - a.priority || b.minutes - a.minutes);
    for (const x of order) {
      if (rest <= 0) break;
      const cut = Math.min(x.minutes, rest);
      plan.push({ id: x.id, label: x.label, cut });
      rest -= cut;
    }
    return { need, deficit, surplus: 0, plan, resolved: rest <= 0, unresolved: Math.max(0, rest) };
  }
  return { need, deficit: 0, surplus: -deficit, plan, resolved: true, unresolved: 0 };
}
