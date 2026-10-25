import { describe, expect, it } from 'vitest';
import { buildSchedule, compareSchedules, naiveSchedule, scheduleStats, splitEvenly, verifySchedule, type SchedulerInput } from '../src/core/scheduler';

const base = (): SchedulerInput => ({
  windowStart: 960, // 16:00
  windowEnd: 1140, // 19:00
  reserveMin: 20,
  breakMin: 5,
  maxStudyBlock: 30,
  tasks: [
    { id: 'hw', title: 'Үй тапсырмасы', kind: 'study', duration: 60, priority: 1, fixed: false },
    { id: 'rd', title: 'Кітап оқу', kind: 'reading', duration: 20, priority: 2, fixed: false },
    { id: 'mv', title: 'Қозғалыс', kind: 'movement', duration: 30, priority: 2, fixed: false },
    { id: 'rs', title: 'Демалыс', kind: 'rest', duration: 30, priority: 2, fixed: false },
  ],
});

const allOk = (input: SchedulerInput) => {
  const r = buildSchedule(input);
  return { r, checks: verifySchedule(r, input) };
};

describe('алгоритмдік жоспарлаушы', () => {
  it('тең бөлу', () => {
    expect(splitEvenly(60, 30)).toEqual([30, 30]);
    expect(splitEvenly(70, 30)).toEqual([24, 23, 23]);
    expect(splitEvenly(20, 30)).toEqual([20]);
    expect(splitEvenly(50, 0)).toEqual([50]);
  });
  it('барлық тексеру өтеді: қосынды = 180, қабаттасу жоқ, резерв ≥ 20', () => {
    const { r, checks } = allOk(base());
    expect(r.errors).toEqual([]);
    expect(checks.every((c) => c.ok)).toBe(true);
    const total = r.items.reduce((s, i) => s + i.end - i.start, 0);
    expect(total).toBe(180);
    expect(r.items.filter((i) => i.taskId === 'hw')).toHaveLength(2);
  });
  it('детерминирленген: бірдей кіріс — бірдей нәтиже', () => {
    expect(buildSchedule(base())).toEqual(buildSchedule(base()));
  });
  it('бекітілген блок орнынан қозғалмайды', () => {
    const input = base();
    input.tasks.push({ id: 'cl', title: 'Үйірме', kind: 'other', duration: 30, priority: 1, fixed: true, fixedStart: 1020 });
    input.reserveMin = 0;
    const { r, checks } = allOk(input);
    const fx = r.items.find((i) => i.taskId === 'cl')!;
    expect(fx.start).toBe(1020);
    expect(fx.end).toBe(1050);
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it('бекітілген блоктар қабаттасса — қате', () => {
    const input = base();
    input.tasks.push({ id: 'a', title: 'A', kind: 'other', duration: 30, priority: 1, fixed: true, fixedStart: 1000 });
    input.tasks.push({ id: 'b', title: 'B', kind: 'other', duration: 30, priority: 1, fixed: true, fixedStart: 1010 });
    expect(buildSchedule(input).errors.length).toBeGreaterThan(0);
  });
  it('терезеден шыққан бекітілген блок — қате', () => {
    const input = base();
    input.tasks.push({ id: 'a', title: 'A', kind: 'other', duration: 30, priority: 1, fixed: true, fixedStart: 1130 });
    expect(buildSchedule(input).errors[0]).toContain('терезесінен');
  });
  it('тапшылық: экран алдымен қысқартылады, тексеру өтеді', () => {
    const input = base();
    input.tasks.push({ id: 'sc', title: 'Экран', kind: 'screen', duration: 60, priority: 3, fixed: false });
    const { r, checks } = allOk(input);
    expect(r.deficit).toBeGreaterThan(0);
    expect(r.trimmed[0].taskId).toBe('sc');
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it('шешілмейтін тапшылық — ең төмен басымдық шығарылады', () => {
    const input = base();
    input.tasks[0].duration = 170;
    const { r, checks } = allOk(input);
    expect(r.unplaced.length).toBeGreaterThan(0);
    expect(checks.find((c) => c.id === 'reserve')!.ok).toBe(true);
    expect(checks.find((c) => c.id === 'sum')!.ok).toBe(true);
  });
  it('нөлдік ұзақтықтағы тапсырмалар еленбейді', () => {
    const input = base();
    input.tasks.forEach((t) => (t.duration = 0));
    const { r, checks } = allOk(input);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].kind).toBe('reserve');
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it('«дейін» нұсқасындағы қабаттасу мен шектен шығу анықталады', () => {
    const input = base();
    input.tasks.push({ id: 'cl', title: 'Үйірме', kind: 'other', duration: 30, priority: 1, fixed: true, fixedStart: 980 });
    input.tasks.push({ id: 'sc', title: 'Экран', kind: 'screen', duration: 60, priority: 3, fixed: false });
    const before = naiveSchedule(input);
    const st = scheduleStats(before, input.windowStart, input.windowEnd);
    expect(st.conflicts).toBeGreaterThan(0);
    expect(st.overflow).toBe(20);
    const after = buildSchedule(input);
    expect(scheduleStats(after.items, input.windowStart, input.windowEnd).conflicts).toBe(0);
    const rows = compareSchedules(before, after, input);
    expect(rows.find((x) => x.taskId === 'cl')!.shift).toBe(0);
  });
  it('терезе қате болса — қате хабар', () => {
    const input = base();
    input.windowEnd = input.windowStart;
    expect(buildSchedule(input).errors.length).toBeGreaterThan(0);
  });
});
