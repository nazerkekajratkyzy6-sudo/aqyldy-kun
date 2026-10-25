import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Delete, Home, Info, Minus, Plus, TriangleAlert } from 'lucide-react';
import { cx } from '../components/ui';
import { Logo } from '../components/Layout';
import { ACTIVITIES, type WithFree } from '../core/kid';
import { ACTIVITY_ART, ACTIVITY_TINT } from './illustrations';

export const KID_COLORS: Record<WithFree, string> = {
  sleep: '#7C3AED',
  school: '#2563EB',
  homework: '#D97706',
  food: '#EA580C',
  rest: '#0D9488',
  reading: '#0891B2',
  movement: '#65A30D',
  play: '#DB2777',
  screen: '#64748B',
  free: '#CBD5E1',
};

/** Бөлімдердің реті — «Келесі» батырмасы үшін. */
export const SECTIONS = [
  { to: '/my-day', label: 'Менің күнім' },
  { to: '/experiments', label: 'Тәжірибе' },
  { to: '/helper', label: 'Ақылды көмекші' },
  { to: '/math', label: 'Уақыт математикасы' },
  { to: '/research', label: 'Менің зерттеуім' },
  { to: '/results', label: 'Нәтижем' },
  { to: '/show', label: 'Жобамды көрсетемін' },
] as const;

export function nextSection(path: string) {
  const i = SECTIONS.findIndex((s) => path.startsWith(s.to));
  return i >= 0 && i < SECTIONS.length - 1 ? SECTIONS[i + 1] : null;
}
export function prevSection(path: string) {
  const i = SECTIONS.findIndex((s) => path.startsWith(s.to));
  return i > 0 ? SECTIONS[i - 1] : null;
}

export interface ShellProps {
  title: string;
  art?: ReactNode;
  instruction: ReactNode;
  step?: { n: number; total: number; label?: string };
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  section: string;
  children: ReactNode;
}

/**
 * Балаға арналған бөлім қабығы: тақырып, қысқа нұсқау, кезең көрсеткіші
 * және төменгі панельде үш үлкен батырма: «Артқа», «Басты бет», «Келесі».
 */
export function KidShell({ title, art, instruction, step, onBack, onNext, nextLabel, backLabel, nextDisabled, section, children }: ShellProps) {
  const nav = useNavigate();
  const next = nextSection(section);
  const prev = prevSection(section);
  const goNext = onNext ?? (() => next && nav(next.to));
  const goBack = onBack ?? (() => (prev ? nav(prev.to) : nav('/')));
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step?.n]);

  return (
    <div className="min-h-dvh bg-white pb-28">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="Басты бет" className="shrink-0">
            <Logo size={32} />
          </Link>
          <span className="truncate font-display text-[17px] font-semibold">{title}</span>
          {step && (
            <div className="ml-auto flex shrink-0 items-center gap-2" aria-label={`Кезең ${step.n} / ${step.total}`}>
              <div className="hidden gap-1.5 sm:flex" aria-hidden>
                {Array.from({ length: step.total }, (_, i) => (
                  <span key={i} className={cx('h-2.5 rounded-full transition-all', i + 1 === step.n ? 'w-8 bg-brand' : i + 1 < step.n ? 'w-2.5 bg-brand/50' : 'w-2.5 bg-line-2')} />
                ))}
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 font-mono text-sm font-semibold text-brand tnum">
                {step.n}/{step.total}
              </span>
            </div>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center gap-4">
          {art && <div className="hidden shrink-0 sm:block">{art}</div>}
          <div className="min-w-0">
            {step?.label && <div className="text-sm font-semibold uppercase tracking-[0.1em] text-brand">{step.n}-қадам</div>}
            <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">{step?.label ?? title}</h1>
            <p className="mt-1.5 text-[17px] leading-relaxed text-ink-2 sm:text-lg">{instruction}</p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step?.n ?? 0} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav aria-label="Бағыттау" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <button type="button" onClick={goBack} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-line-2 bg-white px-3 text-[17px] font-semibold text-ink hover:border-brand">
            <ArrowLeft size={22} aria-hidden /> <span className="truncate">{backLabel ?? 'Артқа'}</span>
          </button>
          <Link to="/" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-soft-2 px-4 text-[17px] font-semibold text-ink-2 hover:bg-brand-50 hover:text-brand">
            <Home size={22} aria-hidden /> <span className="hidden sm:inline">Басты бет</span>
          </Link>
          <button type="button" onClick={goNext} disabled={nextDisabled || (!onNext && !next)} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand px-3 text-[17px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-40">
            <span className="truncate">{nextLabel ?? (next ? 'Келесі' : 'Келесі')}</span> <ArrowRight size={22} aria-hidden />
          </button>
        </div>
      </nav>
    </div>
  );
}

/** Үлкен, түсінікті нәтиже хабары. */
export function ResultMessage({ tone = 'info', children, big }: { tone?: 'ok' | 'warn' | 'info'; children: ReactNode; big?: boolean }) {
  const m = {
    ok: { cls: 'border-ok/30 bg-ok-50', icon: <CheckCircle2 className="text-ok" size={big ? 28 : 22} /> },
    warn: { cls: 'border-amber/40 bg-amber-50', icon: <TriangleAlert className="text-amber-700" size={big ? 28 : 22} /> },
    info: { cls: 'border-brand/20 bg-brand-50', icon: <Info className="text-brand" size={big ? 28 : 22} /> },
  }[tone];
  return (
    <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx('flex items-start gap-3 rounded-2xl border-2 px-4 py-3', m.cls, big ? 'text-xl leading-relaxed sm:text-2xl' : 'text-[17px] leading-relaxed')}>
      <span className="mt-0.5 shrink-0">{m.icon}</span>
      <div className="min-w-0">{children}</div>
    </motion.div>
  );
}

export function minutesText(m: number) {
  const h = Math.floor(Math.abs(m) / 60);
  const mm = Math.abs(m) % 60;
  if (h === 0) return `${mm} мин`;
  if (mm === 0) return `${h} сағ`;
  return `${h} сағ ${mm} мин`;
}

/** Үлкен уақыт таңдағыш: ± батырмалары, сағат + минут, дәл енгізу. */
export function TimeStepper({ value, onChange, max = 1440, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  const [exact, setExact] = useState(false);
  const [h, setH] = useState(String(Math.floor(value / 60)));
  const [m, setM] = useState(String(value % 60));
  useEffect(() => {
    setH(String(Math.floor(value / 60)));
    setM(String(value % 60));
  }, [value]);
  const steps = [5, 15, 60];
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center" aria-live="polite">
        <motion.div key={value} initial={reduce ? false : { scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-5xl font-semibold tnum sm:text-6xl">
          {minutesText(value)}
        </motion.div>
        <div className="mt-1 font-mono text-lg text-ink-3">
          {Math.floor(value / 60)} × 60 + {value % 60} = <b className="text-brand">{value}</b> минут
        </div>
      </div>
      <div className="grid w-full max-w-xl grid-cols-3 gap-2 sm:gap-3">
        {steps.map((s) => (
          <button key={`m${s}`} type="button" onClick={() => onChange(Math.max(0, value - s))} disabled={value <= 0} aria-label={`${label}: ${s} минут азайту`} className="inline-flex h-14 items-center justify-center gap-1 rounded-2xl border-2 border-line-2 bg-white text-lg font-semibold text-ink-2 hover:border-coral disabled:opacity-35">
            <Minus size={18} /> {s === 60 ? '1 сағ' : `${s} мин`}
          </button>
        ))}
        {steps.map((s) => (
          <button key={`p${s}`} type="button" onClick={() => onChange(Math.min(max, value + s))} disabled={value >= max} aria-label={`${label}: ${s} минут қосу`} className="inline-flex h-14 items-center justify-center gap-1 rounded-2xl border-2 border-brand/30 bg-brand-50 text-lg font-semibold text-brand hover:border-brand disabled:opacity-35">
            <Plus size={18} /> {s === 60 ? '1 сағ' : `${s} мин`}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setExact((x) => !x)} aria-expanded={exact} className="text-[15px] font-medium text-ink-3 underline underline-offset-4 hover:text-brand">
        {exact ? 'Дәл енгізуді жабу' : 'Дәл енгізу'}
      </button>
      {exact && (
        <form
          className="flex flex-wrap items-center justify-center gap-2 text-lg"
          onSubmit={(e) => {
            e.preventDefault();
            const hh = Math.max(0, Math.floor(Number(h) || 0));
            const mm = Math.max(0, Math.min(59, Math.floor(Number(m) || 0)));
            onChange(Math.min(max, hh * 60 + mm));
          }}
        >
          <input id="exact-h" inputMode="numeric" aria-label="Сағат" value={h} onChange={(e) => setH(e.target.value)} className="h-12 w-20 rounded-xl border-2 border-line-2 text-center font-mono text-xl" />
          <span>сағ</span>
          <input id="exact-m" inputMode="numeric" aria-label="Минут" value={m} onChange={(e) => setM(e.target.value)} className="h-12 w-20 rounded-xl border-2 border-line-2 text-center font-mono text-xl" />
          <span>мин</span>
          <button type="submit" className="h-12 rounded-xl bg-brand px-4 font-semibold text-white">
            Дайын
          </button>
        </form>
      )}
    </div>
  );
}

export function ActivityCard({ id, minutes, selected, onClick, compact, sub }: { id: WithFree; minutes?: number; selected?: boolean; onClick?: () => void; compact?: boolean; sub?: string }) {
  const Art = ACTIVITY_ART[id];
  const info = ACTIVITIES[id];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': selected } : {})}
      className={cx(
        'group flex w-full flex-col items-center gap-2 rounded-3xl border-2 text-center transition-all',
        compact ? 'p-2.5' : 'p-4',
        selected ? 'border-brand bg-brand-50 shadow-[0_0_0_4px_rgb(37_99_235/0.12)]' : 'border-line bg-white',
        onClick && !selected && 'hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md',
      )}
    >
      <span className="grid place-items-center rounded-2xl" style={{ background: ACTIVITY_TINT[id], width: compact ? 56 : 88, height: compact ? 56 : 88 }}>
        <Art size={compact ? 44 : 68} />
      </span>
      <span className={cx('font-semibold leading-tight', compact ? 'text-[14px]' : 'text-[17px]')}>{info.label}</span>
      {minutes !== undefined && <span className={cx('font-mono tnum', compact ? 'text-[13px] text-ink-3' : 'text-[15px] text-ink-2')}>{minutesText(minutes)}</span>}
      {sub && <span className="text-xs text-ink-3">{sub}</span>}
    </Tag>
  );
}

export function BigButton({ children, onClick, variant = 'primary', className, disabled, icon }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'teal'; className?: string; disabled?: boolean; icon?: ReactNode }) {
  const v = { primary: 'bg-brand text-white hover:bg-brand-700 shadow-sm', teal: 'bg-teal text-white hover:brightness-95 shadow-sm', secondary: 'border-2 border-line-2 bg-white text-ink hover:border-brand hover:text-brand' }[variant];
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx('inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-semibold transition-colors disabled:opacity-40', v, className)}>
      {icon}
      {children}
    </button>
  );
}

/** Экрандағы сан пернетақтасы (планшет пен телефонға ыңғайлы). */
export function NumPad({ value, onChange, onEnter, max = 5 }: { value: string; onChange: (v: string) => void; onEnter?: () => void; max?: number }) {
  const press = (d: string) => value.length < max && onChange(value === '0' ? d : value + d);
  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-2" role="group" aria-label="Сан пернетақтасы">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" onClick={() => press(d)} className="h-14 rounded-2xl border-2 border-line bg-white font-mono text-2xl font-semibold hover:border-brand">
          {d}
        </button>
      ))}
      <button type="button" onClick={() => onChange(value.slice(0, -1))} aria-label="Өшіру" className="grid h-14 place-items-center rounded-2xl border-2 border-line bg-soft text-ink-2 hover:border-coral">
        <Delete size={22} />
      </button>
      <button type="button" onClick={() => press('0')} className="h-14 rounded-2xl border-2 border-line bg-white font-mono text-2xl font-semibold hover:border-brand">
        0
      </button>
      <button type="button" onClick={onEnter} className="h-14 rounded-2xl bg-brand text-lg font-semibold text-white hover:bg-brand-700">
        Тексеру
      </button>
    </div>
  );
}

/** Белгі: үлгі / нақты. Балаға түсінікті сөзбен. */
export function SourceTag({ kind }: { kind: 'demo' | 'real' | 'mine' }) {
  const m = {
    demo: 'bg-amber-50 text-amber-700 border-amber/40',
    real: 'bg-teal-50 text-teal border-teal/40',
    mine: 'bg-brand-50 text-brand border-brand/30',
  }[kind];
  const t = { demo: 'Мысал (үлгі дерек)', real: 'Менің нақты деректерім', mine: 'Менің жоспарым' }[kind];
  return <span className={cx('inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold', m)}>{t}</span>;
}
