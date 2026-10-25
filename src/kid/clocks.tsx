import { motion, useMotionValueEvent, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import type { TaskVisual } from '../core/tasks';
import { parseHM, durationBetween } from '../core/time';
import { minutesText } from './ui';

/**
 * 24 сағаттық тәулік сағаты: бір тіл тәуліктің өткен бөлігін көрсетеді,
 * доға — өткен минуттар, қалғаны — сұр.
 */
export function Dial24({ minutes, size = 340, center }: { minutes: number; size?: number; center?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const c = size / 2;
  const R = size / 2 - 8;
  const ring = R - 26;
  const circ = 2 * Math.PI * ring;
  const frac = Math.max(0, Math.min(1, minutes / 1440));
  const handAngle = useSpringValue(frac * 360, reduce);
  return (
    <div className="relative mx-auto" style={{ width: size, maxWidth: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label={`Тәулік сағаты: ${minutes} минут өтті, ${1440 - minutes} минут қалды`}>
        <defs>
          <radialGradient id="dialbg" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F6FD" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={R} fill="url(#dialbg)" stroke="#DBE5F2" strokeWidth="2" />
        {Array.from({ length: 96 }, (_, i) => {
          const a = (i / 96) * 2 * Math.PI;
          const major = i % 4 === 0;
          const r0 = R - (major ? 12 : 6);
          return <line key={i} x1={c + r0 * Math.sin(a)} y1={c - r0 * Math.cos(a)} x2={c + (R - 2) * Math.sin(a)} y2={c - (R - 2) * Math.cos(a)} stroke={major ? '#6B7A90' : '#CFD8E4'} strokeWidth={major ? 2 : 1} strokeLinecap="round" />;
        })}
        <circle cx={c} cy={c} r={ring} fill="none" stroke="#E8EEF6" strokeWidth="16" />
        <motion.circle
          cx={c}
          cy={c}
          r={ring}
          fill="none"
          stroke="#0D9488"
          strokeWidth="16"
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: circ * (1 - frac) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 18 }}
        />
        {Array.from({ length: 24 }, (_, h) => {
          const a = (h / 24) * 2 * Math.PI;
          const r = ring - 26;
          const big = h % 6 === 0;
          return (
            <text key={h} x={c + r * Math.sin(a)} y={c - r * Math.cos(a) + (big ? 6 : 4)} textAnchor="middle" fontSize={big ? 17 : 11} fontWeight={big ? 700 : 500} fill={big ? '#17263C' : '#6B7A90'} fontFamily="var(--font-mono)">
              {h}
            </text>
          );
        })}
        <g transform={`rotate(${handAngle} ${c} ${c})`}>
          <line x1={c} y1={c - ring * 0.5} x2={c} y2={c - ring + 12} stroke="#17263C" strokeWidth="5" strokeLinecap="round" />
          <circle cx={c} cy={c - ring + 10} r="7" fill="#F59E0B" stroke="#fff" strokeWidth="2.5" />
        </g>
      </svg>
      {center && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div>{center}</div></div>}
    </div>
  );
}

/** 12 сағаттық кәдімгі сағат (есептерге арналған). */
export function AnalogClock({ time, size = 150 }: { time: string; size?: number }) {
  const reduce = useReducedMotion();
  const m = parseHM(time) ?? 0;
  const h12 = (m / 60) % 12;
  const min = m % 60;
  const c = 50;
  const ha = useSpringValue(h12 * 30, reduce);
  const ma = useSpringValue(min * 6, reduce);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Сағат: ${time}`}>
      <circle cx={c} cy={c} r="46" fill="#fff" stroke="#2563EB" strokeWidth="3" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * 2 * Math.PI;
        const big = i % 5 === 0;
        return <line key={i} x1={c + (big ? 37 : 40) * Math.sin(a)} y1={c - (big ? 37 : 40) * Math.cos(a)} x2={c + 42 * Math.sin(a)} y2={c - 42 * Math.cos(a)} stroke={big ? '#17263C' : '#CFD8E4'} strokeWidth={big ? 1.8 : 0.8} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i === 0 ? 12 : i;
        const a = (i / 12) * 2 * Math.PI;
        return (
          <text key={i} x={c + 30 * Math.sin(a)} y={c - 30 * Math.cos(a) + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#17263C" fontFamily="var(--font-sans)">
            {n}
          </text>
        );
      })}
      <line x1={c} y1={c} x2={c} y2={c - 22} stroke="#17263C" strokeWidth="4" strokeLinecap="round" transform={`rotate(${ha} ${c} ${c})`} />
      <line x1={c} y1={c} x2={c} y2={c - 34} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${ma} ${c} ${c})`} />
      <circle cx={c} cy={c} r="3" fill="#F59E0B" />
    </svg>
  );
}

/** Бұрышты жұмсақ (серіппелі) өзгерту; SVG transform атрибуты арқылы — центр дәл сақталады. */
function useSpringValue(target: number, reduce: boolean | null) {
  const mv = useSpring(target, { stiffness: 60, damping: 14 });
  const [v, setV] = useState(target);
  useMotionValueEvent(mv, 'change', setV);
  useEffect(() => {
    if (reduce) {
      mv.jump(target);
      setV(target);
    } else mv.set(target);
  }, [target, reduce, mv]);
  return v;
}

const BAR_COLORS = ['#D97706', '#0891B2', '#65A30D', '#0D9488', '#7C3AED'];

/** Есептің көрнекі шарты. */
export function TaskVisualView({ v }: { v: TaskVisual }) {
  const reduce = useReducedMotion();
  if (v.type === 'dial24') return <Dial24 minutes={1440} size={220} center={<div className="font-display text-2xl font-semibold">24 сағ</div>} />;
  if (v.type === 'clock') return <AnalogClock time={v.time} size={180} />;
  if (v.type === 'hours') {
    const blocks = [...Array.from({ length: v.hours }, () => 60), ...(v.extra ? [v.extra] : [])];
    return (
      <div className="flex w-full max-w-md flex-col gap-2" aria-label="Сағат блоктары">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 flex-1 rounded-xl bg-soft-2">
              <motion.div className="flex h-full items-center rounded-xl px-3 font-mono text-sm font-semibold text-white" style={{ background: b === 60 ? '#2563EB' : '#F59E0B' }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(b / 60) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.15 }}>
                {b} мин
              </motion.div>
            </div>
            <span className="w-16 text-right text-sm text-ink-3">{b === 60 ? '1 сағат' : `${b} минут`}</span>
          </div>
        ))}
      </div>
    );
  }
  if (v.type === 'interval') {
    const s = parseHM(v.from)!;
    const e = parseHM(v.to)!;
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="text-center">
          <AnalogClock time={v.from} size={120} />
          <div className="font-mono text-lg font-semibold">{v.from}</div>
          <div className="text-xs text-ink-3">басталды</div>
        </div>
        <div className="flex flex-col items-center text-ink-3">
          <svg width="70" height="24" viewBox="0 0 70 24" aria-hidden>
            <path d="M4 12h58m-8-7 8 7-8 7" stroke="#2563EB" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm">? минут</span>
        </div>
        <div className="text-center">
          <AnalogClock time={v.to} size={120} />
          <div className="font-mono text-lg font-semibold">{v.to}</div>
          <div className="text-xs text-ink-3">аяқталды</div>
        </div>
        <span className="sr-only">{durationBetween(s, e)} минут</span>
      </div>
    );
  }
  if (v.type === 'bars') {
    const sum = v.items.reduce((s, x) => s + x.minutes, 0);
    const total = v.total ?? sum;
    return (
      <div className="w-full max-w-lg">
        <div className="flex h-12 w-full gap-[3px] overflow-hidden rounded-xl bg-soft-2">
          {v.items.map((x, i) => (
            <motion.div key={x.label} className="flex h-full items-center justify-center overflow-hidden whitespace-nowrap font-mono text-sm font-semibold text-white" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(x.minutes / total) * 100}%` }} transition={{ duration: 0.5, delay: i * 0.12 }}>
              {x.minutes}
            </motion.div>
          ))}
          {v.total && <div className="flex flex-1 items-center justify-center font-mono text-sm font-semibold text-ink-3">?</div>}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          {v.items.map((x, i) => (
            <li key={x.label} className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
              {x.label}: {x.minutes} мин
            </li>
          ))}
          {v.total && <li className="text-ink-3">Барлығы: {v.total} мин</li>}
        </ul>
      </div>
    );
  }
  if (v.type === 'compare') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 text-xl font-semibold">
        <span className="rounded-2xl border-2 border-brand/30 bg-brand-50 px-5 py-3">{v.a}</span>
        <span className="font-mono text-2xl text-ink-3">?</span>
        <span className="rounded-2xl border-2 border-amber/40 bg-amber-50 px-5 py-3">{v.b}</span>
      </div>
    );
  }
  // change
  const max = Math.max(v.from, v.to);
  return (
    <div className="flex items-end justify-center gap-8">
      {[
        { l: 'Бұрын', m: v.from, c: '#94A3B8' },
        { l: 'Кейін', m: v.to, c: '#2563EB' },
      ].map((x, i) => (
        <div key={x.l} className="flex flex-col items-center gap-1">
          <span className="font-mono text-lg font-semibold">{x.m} мин</span>
          <motion.div className="w-16 rounded-t-xl" style={{ background: x.c }} initial={reduce ? false : { height: 0 }} animate={{ height: (x.m / max) * 130 }} transition={{ duration: 0.6, delay: i * 0.2 }} />
          <span className="text-sm text-ink-3">{x.l}</span>
        </div>
      ))}
      <span className="sr-only">{v.label}: {minutesText(v.from)} → {minutesText(v.to)}</span>
    </div>
  );
}
