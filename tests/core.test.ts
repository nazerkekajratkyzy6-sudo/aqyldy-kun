import { describe, expect, it } from 'vitest';
import { MINUTES_PER_DAY, durationBetween, formatDuration, formatHM, parseHM, sanitizeMinutes, splitHM } from '../src/core/time';
import { setActivityMinutes, summarize, efficiencyK, type Activity } from '../src/core/budget';
import { analyzePlan, comparePlans, blockDuration, type Block } from '../src/core/intervals';
import { comparePeriods, delta, describeChange, mean, percentChange, round1 } from '../src/core/stats';
import { fmtNumber, fmtPercent } from '../src/core/format';

describe('уақыт бірліктері', () => {
  it('1 тәулік = 24 × 60 = 1440 минут', () => {
    expect(MINUTES_PER_DAY).toBe(1440);
  });
  it('HH:MM талдау және пішімдеу', () => {
    expect(parseHM('16:45')).toBe(1005);
    expect(parseHM('00:00')).toBe(0);
    expect(parseHM('24:00')).toBe(1440);
    expect(parseHM('24:01')).toBeNull();
    expect(parseHM('12:60')).toBeNull();
    expect(parseHM('abc')).toBeNull();
    expect(formatHM(1005)).toBe('16:45');
    expect(formatHM(1440)).toBe('00:00');
    expect(formatHM(-30)).toBe('23:30');
  });
  it('аралық ұзақтығы, түн ортасынан өту', () => {
    expect(durationBetween(parseHM('16:00')!, parseHM('16:45')!)).toBe(45);
    expect(durationBetween(parseHM('21:00')!, parseHM('07:00')!)).toBe(600);
    expect(durationBetween(600, 600)).toBe(0);
  });
  it('минут ↔ сағат', () => {
    expect(splitHM(90)).toEqual({ hours: 1, minutes: 30 });
    expect(formatDuration(135)).toBe('2 сағ 15 мин');
    expect(formatDuration(45)).toBe('45 мин');
    expect(formatDuration(120)).toBe('2 сағ');
    expect(sanitizeMinutes(-5)).toBe(0);
    expect(sanitizeMinutes('12,6')).toBe(13);
    expect(sanitizeMinutes('x')).toBe(0);
  });
});

const acts = (): Activity[] => [
  { id: 'sleep', name: 'Ұйқы', minutes: 600, useful: false, color: '' },
  { id: 'school', name: 'Мектеп', minutes: 300, useful: true, color: '' },
  { id: 'hw', name: 'Үй тапсырмасы', minutes: 60, useful: true, color: '' },
];

describe('1440 минут моделі', () => {
  it('R = 1440 − ΣTi және пайыздар', () => {
    const s = summarize(acts());
    expect(s.total).toBe(960);
    expect(s.remainder).toBe(480);
    expect(s.percents.sleep).toBeCloseTo(41.667, 2);
    expect(s.valid).toBe(true);
  });
  it('нөлдік мәндер дұрыс өңделеді', () => {
    const s = summarize(acts().map((a) => ({ ...a, minutes: 0 })));
    expect(s.total).toBe(0);
    expect(s.remainder).toBe(1440);
    expect(s.efficiencyK).toBe(0);
  });
  it('теріс мән 0-ге шектеледі, басқалар өзгермейді', () => {
    const r = setActivityMinutes(acts(), 'hw', -20);
    expect(r.applied).toBe(0);
    expect(r.clamped).toBe('negative');
    expect(r.list.find((a) => a.id === 'sleep')!.minutes).toBe(600);
  });
  it('тәуліктен асу тыйым салынады: шек = 1440 − басқалар', () => {
    const r = setActivityMinutes(acts(), 'hw', 2000);
    expect(r.max).toBe(540);
    expect(r.applied).toBe(540);
    expect(r.clamped).toBe('overflow');
    expect(summarize(r.list).remainder).toBe(0);
    expect(r.list.find((a) => a.id === 'school')!.minutes).toBe(300);
  });
  it('шекара: дәл 1440 рұқсат етіледі', () => {
    const r = setActivityMinutes(acts(), 'hw', 540);
    expect(r.clamped).toBeNull();
    expect(summarize(r.list).total).toBe(1440);
  });
  it('K = 180/1440 × 100% = 12,5% (зерттеу жұмысындағы мысал)', () => {
    expect(efficiencyK(180, 1440)).toBe(12.5);
    expect(efficiencyK(10, 0)).toBeNull();
  });
});

const B = (id: string, s: string, e: string, extra: Partial<Block> = {}): Block => ({ id, title: id, category: 'other', start: parseHM(s)!, end: parseHM(e)!, priority: 2, fixed: false, ...extra });

describe('күн жоспарын талдау', () => {
  it('қабаттасуды табады', () => {
    const a = analyzePlan([B('a', '15:00', '16:00'), B('b', '15:30', '16:30')]);
    expect(a.overlaps).toHaveLength(1);
    expect(a.overlaps[0].minutes).toBe(30);
    expect(a.ok).toBe(false);
  });
  it('шектес блоктар қабаттаспайды', () => {
    expect(analyzePlan([B('a', '15:00', '16:00'), B('b', '16:00', '17:00')]).overlaps).toHaveLength(0);
  });
  it('түн ортасынан өтетін ұйқы және бос аралықтар', () => {
    const a = analyzePlan([B('sleep', '21:00', '07:00'), B('school', '08:00', '13:00')]);
    expect(a.midnight).toEqual(['sleep']);
    expect(blockDuration(B('s', '21:00', '07:00'))).toBe(600);
    expect(a.coveredMinutes).toBe(900);
    expect(a.uncoveredMinutes).toBe(540);
    expect(a.gaps.map((g) => [formatHM(g.start), formatHM(g.end), g.minutes])).toEqual([
      ['07:00', '08:00', 60],
      ['13:00', '21:00', 480],
    ]);
  });
  it('түн ортасы арқылы өтетін бос аралық біріктіріледі', () => {
    const a = analyzePlan([B('day', '06:00', '23:00')]);
    expect(a.gaps).toHaveLength(1);
    expect(a.gaps[0]).toMatchObject({ start: 1380, end: 360, minutes: 420 });
  });
  it('түн ортасындағы қабаттасу', () => {
    const a = analyzePlan([B('sleep', '21:00', '07:00'), B('read', '06:30', '07:30')]);
    expect(a.overlaps[0].minutes).toBe(30);
  });
  it('нөлдік ұзақтық — қате', () => {
    const a = analyzePlan([B('z', '10:00', '10:00')]);
    expect(a.errors[0].code).toBe('zero');
  });
  it('екі жоспарды салыстыру', () => {
    const d = comparePlans([B('Кітап', '16:00', '16:30', { category: 'reading' })], [B('Кітап', '17:00', '17:20', { category: 'reading' }), B('Қозғалыс', '16:00', '16:30', { category: 'movement' })]);
    expect(d.find((x) => x.kind === 'shift')!.minutes).toBe(60);
    expect(d.find((x) => x.kind === 'duration')!.minutes).toBe(-10);
    expect(d.find((x) => x.kind === 'onlyB')!.label).toBe('Қозғалыс');
    expect(d.find((x) => x.kind === 'category' && x.label === 'Кітап оқу')!.minutes).toBe(-10);
  });
});

describe('статистика', () => {
  it('орташа мән M = Σxi/n', () => {
    expect(mean([70, 65, 60, 55, 55])).toBe(61);
    expect(mean([])).toBeNull();
    expect(mean([null, undefined])).toBeNull();
  });
  it('Δ = факт − жоспар', () => {
    expect(delta(70, 60)).toBe(10);
    expect(delta(0, 30)).toBe(-30);
  });
  it('P = (B − A)/A × 100%, A = 0 болса анықталмайды', () => {
    expect(round1(percentChange(90, 60)!)).toBe(-33.3);
    expect(percentChange(15, 30)).toBe(100);
    expect(round1(percentChange(30, 10)!)).toBe(-66.7);
    expect(percentChange(0, 10)).toBeNull();
  });
  it('дерек жоқ — тұжырым жоқ', () => {
    const c = comparePeriods([], [10]);
    expect(c.sufficient).toBe(false);
    expect(describeChange('Экран', c)).toContain('дерек жеткіліксіз');
  });
  it('сақ тұжырым: аз күн туралы ескерту', () => {
    const c = comparePeriods([90], [60]);
    expect(describeChange('Экран', c)).toContain('азайған');
    expect(describeChange('Экран', c)).toContain('бағыт');
  });
  it('қазақша сан пішімі', () => {
    expect(fmtNumber(33.333)).toBe('33,3');
    expect(fmtNumber(1440, 0)).toBe('1 440');
    expect(fmtPercent(-33.33, 1, true)).toBe('−33,3%');
    expect(fmtPercent(null)).toBe('—');
  });
});

import { shiftBlock } from '../src/core/intervals';
describe('блокты жылжыту', () => {
  it('ұзақтық сақталады, түн ортасынан өтеді', () => {
    const b = B('x', '23:00', '23:45');
    const s = shiftBlock(b, 30);
    expect([formatHM(s.start), formatHM(s.end)]).toEqual(['23:30', '00:15']);
    expect(blockDuration(s)).toBe(45);
    const back = shiftBlock(s, -30);
    expect([back.start, back.end]).toEqual([b.start, b.end]);
    const m = shiftBlock(B('y', '23:00', '23:30'), 30);
    expect(m.end).toBe(1440);
    expect(blockDuration(m)).toBe(30);
  });
});
