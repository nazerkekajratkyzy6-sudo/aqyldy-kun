import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, Minus, Plus, XCircle } from 'lucide-react';
import { fmtNumber } from '../core/format';

export function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const v: Record<Variant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-700 shadow-sm',
    teal: 'bg-teal text-white hover:brightness-95 shadow-sm',
    secondary: 'bg-white text-ink border border-line-2 hover:border-brand hover:text-brand',
    ghost: 'text-ink-2 hover:bg-soft-2 hover:text-ink',
    danger: 'bg-white text-danger border border-line-2 hover:border-danger hover:bg-danger-50',
  };
  const s = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-[15px] gap-2', lg: 'h-13 px-6 text-base gap-2.5' }[size];
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap', v[variant], s, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, as: As = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx('rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, icon, actions }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">{icon}</div>}
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Дерек көзінің белгісі: үлгі немесе нақты. */
export function DataBadge({ kind, className }: { kind: 'demo' | 'real' | 'edited'; className?: string }) {
  const map = {
    demo: { cls: 'bg-amber-50 text-amber-700 border-amber/40', text: 'ҮЛГІ ДЕРЕК — нақты бақылау емес' },
    edited: { cls: 'bg-amber-50 text-amber-700 border-amber/40', text: 'ӨЗГЕРТІЛГЕН СЦЕНАРИЙ — модельдеу' },
    real: { cls: 'bg-teal-50 text-teal border-teal/40', text: 'НАҚТЫ ЗЕРТТЕУ ДЕРЕГІ' },
  }[kind];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide', map.cls, className)}>
      <FlaskConical size={13} aria-hidden />
      {map.text}
    </span>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'teal'; className?: string }) {
  const t = {
    neutral: 'bg-soft-2 text-ink-2',
    brand: 'bg-brand-50 text-brand',
    ok: 'bg-ok-50 text-ok',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-danger-50 text-danger',
    teal: 'bg-teal-50 text-teal',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', t, className)}>{children}</span>;
}

export function Callout({ tone = 'info', title, children, className }: { tone?: 'info' | 'warn' | 'ok' | 'danger'; title?: ReactNode; children: ReactNode; className?: string }) {
  const m = {
    info: { cls: 'bg-brand-50 border-brand/20 text-ink', icon: <Info size={18} className="text-brand" /> },
    warn: { cls: 'bg-amber-50 border-amber/30 text-ink', icon: <AlertTriangle size={18} className="text-amber-700" /> },
    ok: { cls: 'bg-ok-50 border-ok/25 text-ink', icon: <CheckCircle2 size={18} className="text-ok" /> },
    danger: { cls: 'bg-danger-50 border-danger/25 text-ink', icon: <XCircle size={18} className="text-danger" /> },
  }[tone];
  return (
    <div role={tone === 'danger' || tone === 'warn' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed', m.cls, className)}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {m.icon}
      </span>
      <div className="min-w-0">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** Сан өзгергенде жұмсақ анимациямен ауысады (reduced-motion кезінде бірден). */
export function AnimatedNumber({ value, digits = 0, className }: { value: number; digits?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !Number.isFinite(value)) {
      el.textContent = fmtNumber(value, digits);
      prev.current = value;
      return;
    }
    const ctrl = animate(prev.current, value, {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmtNumber(v, digits);
      },
    });
    prev.current = value;
    return () => ctrl.stop();
  }, [value, digits, reduce]);
  return (
    <span ref={ref} className={cx('tnum', className)}>
      {fmtNumber(value, digits)}
    </span>
  );
}

export function Stat({ label, value, unit, digits = 0, tone = 'ink', hint, big }: { label: ReactNode; value: number | null; unit?: string; digits?: number; tone?: 'ink' | 'brand' | 'teal' | 'amber' | 'danger' | 'ok'; hint?: ReactNode; big?: boolean }) {
  const color = { ink: 'text-ink', brand: 'text-brand', teal: 'text-teal', amber: 'text-amber-700', danger: 'text-danger', ok: 'text-ok' }[tone];
  return (
    <div className="rounded-2xl border border-line bg-soft px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('mt-1 font-display font-semibold leading-none', big ? 'text-4xl' : 'text-2xl', color)}>
        {value === null ? <span className="text-ink-3">—</span> : <AnimatedNumber value={value} digits={digits} />}
        {unit && value !== null && <span className="ml-1 text-sm font-medium text-ink-3">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

/** Формула блогы: моноширинды, анық. */
export function Formula({ children, label, className }: { children: ReactNode; label?: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-line bg-soft px-4 py-3', className)}>
      {label && <div className="mb-1 text-xs font-medium text-ink-3">{label}</div>}
      <div className="font-mono text-[15px] leading-relaxed text-ink break-words">{children}</div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, lead }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode }) {
  return (
    <div className="mb-6 max-w-3xl">
      {eyebrow && <div className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow}</div>}
      <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{lead}</p>}
    </div>
  );
}

/** Минуттық сандық өріс: − / + батырмалары, шектеу. */
export function MinutesInput({ value, onChange, min = 0, max = 1440, step = 5, label, id, suffix = 'мин', invalid, compact }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; id?: string; suffix?: string; invalid?: boolean; compact?: boolean }) {
  const auto = useId();
  const fid = id ?? auto;
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = Number(raw.replace(',', '.'));
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    onChange(Math.round(n));
  };
  return (
    <div className={cx('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      <button type="button" aria-label={label ? `${label}: азайту` : 'Азайту'} className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-2 text-ink-2 hover:border-brand hover:text-brand disabled:opacity-40" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        <Minus size={16} />
      </button>
      <div className={cx('relative', compact ? 'w-20' : 'w-24')}>
        <input
          id={fid}
          inputMode="numeric"
          aria-label={label}
          aria-invalid={invalid || undefined}
          className={cx('h-9 w-full rounded-lg border bg-white pl-2.5 pr-9 text-right font-mono text-[15px] tnum focus:border-brand', invalid ? 'border-danger' : 'border-line-2')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3">{suffix}</span>
      </div>
      <button type="button" aria-label={label ? `${label}: көбейту` : 'Көбейту'} className="grid size-9 shrink-0 place-items-center rounded-lg border border-line-2 text-ink-2 hover:border-brand hover:text-brand disabled:opacity-40" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Slider({ value, min = 0, max, step = 5, onChange, color = '#2563EB', label, valueText }: { value: number; min?: number; max: number; step?: number; onChange: (v: number) => void; color?: string; label: string; valueText?: string }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={Math.max(max, min)}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--fill' as string]: `${fill}%`, ['--track-color' as string]: color }}
    />
  );
}

/** 24 сағаттық уақыт өрісі (СС:ММ). Браузер локаліне тәуелсіз. */
export function TimeInput({ value, onChange, label, id }: { value: string; onChange: (v: string) => void; label: string; id?: string }) {
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(value);
    setBad(false);
  }, [value]);
  const commit = (raw: string) => {
    let t = raw.trim().replace('.', ':');
    if (/^\d{3,4}$/.test(t)) t = t.padStart(4, '0').replace(/^(\d{2})(\d{2})$/, '$1:$2');
    if (/^\d{1,2}$/.test(t)) t = `${t}:00`;
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m || Number(m[1]) > 24 || Number(m[2]) > 59 || (Number(m[1]) === 24 && Number(m[2]) > 0)) {
      setBad(true);
      return;
    }
    const norm = `${m[1].padStart(2, '0')}:${m[2]}`;
    setBad(false);
    setText(norm);
    if (norm !== value) onChange(norm);
  };
  return (
    <input
      id={id}
      inputMode="numeric"
      aria-label={`${label} (СС:ММ)`}
      aria-invalid={bad || undefined}
      placeholder="СС:ММ"
      maxLength={5}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit((e.target as HTMLInputElement).value);
        }
      }}
      className={cx('h-9 w-[4.6rem] rounded-lg border bg-white px-2 text-center font-mono text-[15px] tnum focus:border-brand', bad ? 'border-danger' : 'border-line-2')}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl border border-line bg-soft p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx('relative rounded-lg font-medium transition-colors', size === 'sm' ? 'px-2.5 py-1 text-[13px]' : 'px-3.5 py-1.5 text-sm', active ? 'text-ink' : 'text-ink-3 hover:text-ink')}
          >
            {active && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: ReactNode; htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export const inputCls = 'h-10 w-full rounded-lg border border-line-2 bg-white px-3 text-[15px] focus:border-brand';

export function CheckRow({ ok, label, detail }: { ok: boolean; label: ReactNode; detail?: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" aria-label="Дұрыс" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-label="Қате" />}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="font-mono text-xs leading-relaxed text-ink-3 break-words">{detail}</div>}
      </div>
    </li>
  );
}

export function Legend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: i.dashed ? 'transparent' : i.color, border: i.dashed ? `2px dashed ${i.color}` : undefined }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
