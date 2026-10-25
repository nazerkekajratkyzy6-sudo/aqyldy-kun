import { describe, expect, it } from 'vitest';
import { EXAMPLE_DAY, adviceFor, analyzeChildPlan, changeSentence, compareBalanced, dayFree, dayTotal, emptyDay, explainChanges, hmToMinutes, improveChildPlan, setActivity, transfer, type ChildBlock } from '../src/core/kid';
import { verifySchedule } from '../src/core/scheduler';
import { toSchedulerInput, DEFAULT_HELPER_SETTINGS } from '../src/core/kid';
import { LEVELS, TASKS } from '../src/core/tasks';

describe('«Менің күнім» моделі', () => {
  it('Σ + бос уақыт = 1440', () => {
    expect(dayTotal(EXAMPLE_DAY)).toBe(1230);
    expect(dayFree(EXAMPLE_DAY)).toBe(210);
    expect(dayTotal(EXAMPLE_DAY) + dayFree(EXAMPLE_DAY)).toBe(1440);
    expect(dayFree(emptyDay())).toBe(1440);
  });
  it('сағатты минутқа айналдыру', () => {
    expect(hmToMinutes(1, 30)).toBe(90);
    expect(hmToMinutes(10, 0)).toBe(600);
  });
  it('шектен асу: бос уақыттан артық қосылмайды, басқа істер өзгермейді', () => {
    const r = setActivity(EXAMPLE_DAY, 'reading', 1000);
    expect(r.applied).toBe(240);
    expect(r.clamped).toBe(true);
    expect(dayFree(r.plan)).toBe(0);
    expect(r.plan.sleep).toBe(600);
    expect(setActivity(EXAMPLE_DAY, 'reading', -5).applied).toBe(0);
  });
  it('түсіндірме сөйлем', () => {
    expect(changeSentence('reading', 30, 40)).toBe('Кітап оқуға 10 минут қостың. Бос уақыт 10 минутқа азайды.');
    expect(changeSentence('screen', 60, 30)).toBe('Экраннан 30 минут алдың. Бос уақыт 30 минутқа көбейді.');
    expect(changeSentence('reading', 30, 40, 100)).toContain('тек 10 минут');
  });
});

describe('2-тәжірибе: минут ауыстыру', () => {
  it('экраннан кітапқа 30 минут: жалпы уақыт өзгермейді', () => {
    const t = transfer(EXAMPLE_DAY, 'screen', 'reading', 30);
    expect(t.moved).toBe(30);
    expect([t.fromBefore, t.fromAfter, t.toBefore, t.toAfter]).toEqual([60, 30, 30, 60]);
    expect(t.totalBefore).toBe(1440);
    expect(t.totalAfter).toBe(1440);
    expect(dayFree(t.after)).toBe(dayFree(t.before));
  });
  it('бар уақыттан артық ауыстыру мүмкін емес', () => {
    const t = transfer(EXAMPLE_DAY, 'screen', 'reading', 100);
    expect(t.moved).toBe(60);
    expect(t.after.screen).toBe(0);
  });
  it('бос уақыттан ауыстыру және бір іске өзіне', () => {
    const t = transfer(EXAMPLE_DAY, 'free', 'movement', 20);
    expect(t.after.movement).toBe(50);
    expect(dayFree(t.after)).toBe(190);
    expect(transfer(EXAMPLE_DAY, 'reading', 'reading', 10).moved).toBe(0);
  });
});

describe('3-тәжірибе: теңгерімді салыстыру', () => {
  it('экран азайып, кітап көбейсе (ұйқы мен демалыс сақталса) — Ә теңгерімдірек', () => {
    const b = transfer(EXAMPLE_DAY, 'screen', 'reading', 30).after;
    const v = compareBalanced(EXAMPLE_DAY, b);
    expect(v.kind).toBe('b');
  });
  it('оқу көбейіп, ұйқы азайса — «тиімді» деп жарияланбайды', () => {
    const b = { ...EXAMPLE_DAY, homework: 120, sleep: 540 };
    const v = compareBalanced(EXAMPLE_DAY, b);
    expect(v.kind).toBe('mixed');
    expect(v.reasons.join(' ')).toContain('ұйқы 60 минутқа азайған');
  });
  it('тек үй тапсырмасын көбейту (бос уақыт есебінен) — тиімді емес', () => {
    const b = { ...EXAMPLE_DAY, homework: 120 };
    expect(compareBalanced(EXAMPLE_DAY, b).kind).toBe('mixed');
  });
  it('бірдей жоспар', () => {
    expect(compareBalanced(EXAMPLE_DAY, { ...EXAMPLE_DAY }).kind).toBe('same');
  });
});

const W0 = 960;
const W1 = 1140;
const plan = (): ChildBlock[] => [
  { id: 'hw', activity: 'homework', title: 'Үй тапсырмасы', start: 960, duration: 60, fixed: false },
  { id: 'rd', activity: 'reading', title: 'Кітап оқу', start: 1005, duration: 20, fixed: false },
  { id: 'mv', activity: 'movement', title: 'Қозғалыс', start: 1050, duration: 30, fixed: false },
  { id: 'rs', activity: 'rest', title: 'Демалыс', start: 1080, duration: 30, fixed: false },
];

describe('Ақылды көмекші', () => {
  it('қабаттасу, қосынды және бос уақытты табады', () => {
    const a = analyzeChildPlan(plan(), W0, W1);
    expect(a.sum).toBe(140);
    expect(a.overlaps).toHaveLength(1);
    expect(a.overlaps[0].minutes).toBe(15);
    expect(a.covered).toBe(125);
    expect(a.free).toBe(55);
    expect(a.ok).toBe(false);
    const adv = adviceFor(a, plan()).map((x) => x.text).join(' ');
    expect(adv).toContain('Екі іс бір уақытта жоспарланған');
    expect(adv).toContain('60 + 20 + 30 + 30 = 140');
  });
  it('уақыттан шығу және тапшылық', () => {
    const p = plan();
    p[3].start = 1120;
    p[0].duration = 120;
    const a = analyzeChildPlan(p, W0, W1);
    expect(a.outside.find((o) => o.id === 'rs')!.minutes).toBe(10);
    expect(a.deficit).toBe(20);
  });
  it('жақсартылған жоспар барлық тексеруден өтеді, міндетті іс орнында', () => {
    const p = plan();
    p[2].fixed = true;
    const r = improveChildPlan(p, W0, W1);
    const checks = verifySchedule(r, toSchedulerInput(p, W0, W1, DEFAULT_HELPER_SETTINGS));
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(r.items.find((i) => i.taskId === 'mv')!.start).toBe(1050);
    const ex = explainChanges(p, analyzeChildPlan(p, W0, W1), r);
    expect(ex.some((s) => s.includes('міндетті іс'))).toBe(true);
  });
  it('дұрыс жоспар үшін мақұлдау', () => {
    const p = plan();
    p[1].start = 1020;
    const a = analyzeChildPlan(p, W0, W1);
    expect(a.ok).toBe(true);
    expect(adviceFor(a, p).some((x) => x.tone === 'ok')).toBe(true);
  });
});

describe('15 есеп: 3 деңгей × 5', () => {
  it('әр деңгейде 5 есеп, әрқайсысында қадамдық түсіндірме', () => {
    expect(LEVELS).toHaveLength(3);
    for (const l of [1, 2, 3]) expect(TASKS.filter((t) => t.level === l)).toHaveLength(5);
    for (const t of TASKS) expect(t.steps.length).toBeGreaterThanOrEqual(2);
  });
});
