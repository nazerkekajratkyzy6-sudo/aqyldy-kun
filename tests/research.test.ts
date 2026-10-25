import { describe, expect, it } from 'vitest';
import { averages, firstLastChange, makeExport, parseImport, emptyEntry, splitPeriods, comparePeriodsByMetric, mixedDayTypes, DiaryEntrySchema } from '../src/core/diary';
import { PAPER_RESULTS, SAMPLE_DIARY, SAMPLE_PLAN_FACT } from '../src/data/research';
import { round1 } from '../src/core/stats';
import { distribution, planFact, screenRemainder, screenSeries, timeDeficit } from '../src/core/experiments';
import { TASKS, checkTask } from '../src/core/tasks';

describe('зерттеу жұмысының есептері қайта шығарылады (үлгі деректер)', () => {
  it('5 күндік орташа мәндер: 61, 75, 22, 31, 20', () => {
    const av = averages(SAMPLE_DIARY);
    for (const [k, v] of Object.entries(PAPER_RESULTS.averages)) expect(Math.round(av[k as keyof typeof av]!)).toBe(v);
  });
  it('экран −30 мин (−33,3%), кітап +15 мин (+100%), жоспардан тыс −20 мин (−66,7%)', () => {
    for (const m of ['screen', 'reading', 'unplanned'] as const) {
      const c = firstLastChange(SAMPLE_DIARY, m)!;
      expect(c.diff).toBe(PAPER_RESULTS[m].diff);
      expect(round1(c.pct!)).toBe(PAPER_RESULTS[m].pct);
    }
  });
  it('2.2-кесте: Δ = +10, −5, −5, +30, −30', () => {
    const r = planFact(SAMPLE_PLAN_FACT);
    expect(r.rows.map((x) => x.delta)).toEqual([10, -5, -5, 30, -30]);
    expect(r.biggest!.id).toBe('screen');
  });
  it('2.3: 60 + 20 + 30 + 30 = 140; 180 − 140 = 40 мин резерв', () => {
    const r = distribution(180, { homework: 60, reading: 20, movement: 30, rest: 30 }, ['homework', 'reading']);
    expect(r.used).toBe(140);
    expect(r.reserve).toBe(40);
  });
});

describe('эксперименттер', () => {
  it('экран және қалдық', () => {
    expect(screenRemainder(180, [60, 20, 30], 60)).toMatchObject({ tasks: 110, remainder: 10, deficit: 0, maxScreen: 70 });
    expect(screenRemainder(180, [60, 20, 30], 90).deficit).toBe(20);
    const s = screenSeries(180, [60, 20, 30], 30);
    expect(s[0]).toEqual({ screen: 0, remainder: 70 });
    expect(s.at(-1)).toEqual({ screen: 180, remainder: -110 });
  });
  it('уақыт тапшылығы және қысқарту жоспары', () => {
    const r = timeDeficit(180, [
      { id: 'hw', label: 'Үй', minutes: 60, priority: 1, flexible: false },
      { id: 'scr', label: 'Экран', minutes: 60, priority: 3, flexible: true },
      { id: 'mv', label: 'Қозғалыс', minutes: 30, priority: 2, flexible: true },
      { id: 'rd', label: 'Кітап', minutes: 20, priority: 1, flexible: false },
      { id: 'rs', label: 'Демалыс', minutes: 30, priority: 2, flexible: true },
    ]);
    expect(r.need).toBe(200);
    expect(r.deficit).toBe(20);
    expect(r.plan).toEqual([{ id: 'scr', label: 'Экран', cut: 20 }]);
    expect(r.resolved).toBe(true);
    expect(timeDeficit(180, [{ id: 'a', label: 'a', minutes: 100, priority: 1, flexible: false }]).surplus).toBe(80);
  });
});

describe('күнделік деректері', () => {
  it('экспорт → импорт қайта қалпына келтіреді', () => {
    const e = { ...emptyEntry('x1', '2026-10-01'), fact: { homework: 50, screen: 40, reading: 20, movement: 30, unplanned: 5 } };
    const r = parseImport(JSON.stringify(makeExport([e])));
    expect(r.ok).toBe(true);
    expect(r.entries[0]).toEqual(e);
  });
  it('қате файл қабылданбайды', () => {
    expect(parseImport('{').ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: 'other' })).ok).toBe(false);
    const bad = { ...emptyEntry('x', '2026-10-01'), fact: { homework: -1, screen: 0, reading: 0, movement: 0, unplanned: 0 } };
    expect(parseImport(JSON.stringify(makeExport([bad as never]))).ok).toBe(false);
  });
  it('қосынды 1440-тан аспауы керек', () => {
    const e = { ...emptyEntry('x', '2026-10-01'), fact: { homework: 1000, screen: 500, reading: 0, movement: 0, unplanned: 0 } };
    expect(DiaryEntrySchema.safeParse(e).success).toBe(false);
  });
  it('бір күн екі рет — қате', () => {
    const r = parseImport(JSON.stringify(makeExport([emptyEntry('a', '2026-10-01'), emptyEntry('b', '2026-10-01')])));
    expect(r.ok).toBe(false);
  });
  it('10 күндік протокол: кезеңдер бойынша салыстыру', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      ...emptyEntry(`e${i}`, `2026-10-${String(i + 1).padStart(2, '0')}`),
      phase: (i < 5 ? 'self' : 'assistant') as 'self' | 'assistant',
      fact: { homework: 60, screen: i < 5 ? 80 : 60, reading: 20, movement: 30, unplanned: 10 },
    }));
    const p = splitPeriods(entries, 'phase');
    expect(p.a).toHaveLength(5);
    const c = comparePeriodsByMetric(p.a, p.b);
    expect(c.screen.diff).toBe(-20);
    expect(c.screen.pct).toBe(-25);
    expect(mixedDayTypes(entries)).toBe(false);
    expect(mixedDayTypes([...entries, { ...entries[0], id: 'w', dayType: 'weekend' }])).toBe(true);
  });
});

describe('15 есеп', () => {
  it('15 есеп, әрқайсысының дұрыс жауабы өтеді', () => {
    expect(TASKS).toHaveLength(15);
    for (const t of TASKS) {
      const ans =
        t.type === 'number'
          ? { kind: 'number' as const, value: String(t.answer) }
          : t.type === 'hm'
            ? { kind: 'hm' as const, hours: String(t.answer.hours), minutes: String(t.answer.minutes) }
            : { kind: 'choice' as const, index: t.answer };
      expect(checkTask(t, ans)).toBe('correct');
    }
  });
  it('қате және бос жауаптар', () => {
    const t1 = TASKS[0];
    expect(checkTask(t1, { kind: 'number', value: '1400' })).toBe('wrong');
    expect(checkTask(t1, { kind: 'number', value: '' })).toBe('invalid');
    expect(checkTask(t1, { kind: 'number', value: '-5' })).toBe('invalid');
    const hm = TASKS.find((t) => t.type === 'hm')!;
    expect(checkTask(hm, { kind: 'hm', hours: '0', minutes: '90' })).toBe('wrong');
  });
  it('мәтіндегі арифметика дұрыс', () => {
    expect(24 * 60).toBe(1440);
    expect(60 + 20 + 30 + 30).toBe(140);
    expect(30 + 30 + 60 + 20).toBe(140);
  });
});
