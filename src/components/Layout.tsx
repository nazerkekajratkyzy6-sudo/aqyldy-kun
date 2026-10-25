import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { BarChart3, BookOpenCheck, CalendarRange, Clock3, FlaskConical, ListChecks, Menu, NotebookPen, Presentation, Sparkles, X, ScrollText } from 'lucide-react';
import { cx } from './ui';

export const LABS = [
  { to: '/teacher/1440', n: 1, label: '1440 минут', icon: Clock3, desc: 'Тәулікті әрекеттерге бөлу, R = 1440 − ΣTᵢ' },
  { to: '/teacher/constructor', n: 2, label: 'Күн конструкторы', icon: CalendarRange, desc: 'Блоктар, қабаттасу, бос аралықтар, екі жоспарды салыстыру' },
  { to: '/teacher/experiments', n: 3, label: 'Эксперименттер', icon: FlaskConical, desc: '5 қайталанатын эксперимент: есеп, график, қорытынды' },
  { to: '/teacher/assistant', n: 4, label: 'ЖИ-көмекші', icon: Sparkles, desc: 'Алгоритмдік жоспарлаушы: дейін/кейін және тексеру' },
  { to: '/teacher/tasks', n: 5, label: '15 есеп', icon: ListChecks, desc: 'Сағат, минут, аралық, қосу, азайту, салыстыру' },
  { to: '/teacher/diary', n: 6, label: 'Зерттеу күнделігі', icon: NotebookPen, desc: 'Нақты бақылау: 5/7/10/14 күн, JSON, IndexedDB' },
] as const;

const MAIN = [
  { to: '/teacher/analytics', label: 'Талдау', icon: BarChart3 },
  { to: '/teacher/method', label: 'Әдістеме', icon: ScrollText },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Негізгі мазмұнға өту
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/teacher" className="flex items-center gap-2.5" aria-label="Толық зертхана — бастапқы бет">
            <Logo />
            <span className="whitespace-nowrap leading-tight">
              <span className="block font-display text-[15px] font-bold tracking-[0.06em]">AQYLDY KÜN</span>
              <span className="block text-[11px] text-ink-3">Ересектерге: толық зертхана</span>
            </span>
          </Link>
          <nav aria-label="Негізгі мәзір" className="ml-auto hidden items-center gap-0.5 2xl:flex">
            {LABS.map((l) => (
              <TopLink key={l.to} to={l.to}>
                <span className="text-ink-3">{l.n}.</span> {l.label}
              </TopLink>
            ))}
            <span className="mx-1 h-6 w-px bg-line" aria-hidden />
            {MAIN.map((l) => (
              <TopLink key={l.to} to={l.to}>
                {l.label}
              </TopLink>
            ))}
          </nav>
          <Link to="/teacher/defense" className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white shadow-sm whitespace-nowrap hover:bg-brand-700 2xl:ml-2">
            <Presentation size={17} aria-hidden />
            <span className="hidden sm:inline">Жобаны қорғау</span>
          </Link>
          <button type="button" className="grid size-10 place-items-center rounded-xl border border-line-2 2xl:hidden" aria-label={open ? 'Мәзірді жабу' : 'Мәзірді ашу'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav aria-label="Мобильді мәзір" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line bg-white 2xl:hidden">
              <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
                {LABS.map((l) => (
                  <MobileLink key={l.to} to={l.to} icon={<l.icon size={18} />}>
                    {l.n}. {l.label}
                  </MobileLink>
                ))}
                {MAIN.map((l) => (
                  <MobileLink key={l.to} to={l.to} icon={<l.icon size={18} />}>
                    {l.label}
                  </MobileLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-soft">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={16} aria-hidden /> Толық зертхана (мұғалім мен ата-анаға). <Link to="/" className="font-semibold text-brand underline underline-offset-4">Оқушы бетіне оралу</Link>
          </div>
          <div>Үлгі деректер — зерттеу жұмысынан, нақты бақылау емес.</div>
        </div>
      </footer>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => cx('whitespace-nowrap rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors', isActive ? 'bg-brand-50 text-brand' : 'text-ink-2 hover:bg-soft-2 hover:text-ink')}>
      {children}
    </NavLink>
  );
}

function MobileLink({ to, children, icon }: { to: string; children: ReactNode; icon: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium', isActive ? 'bg-brand-50 text-brand' : 'text-ink hover:bg-soft')}>
      {icon}
      {children}
    </NavLink>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#2563EB" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="5" />
      <path d="M32 13 A19 19 0 0 1 49.5 39.3" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 32V21" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M32 32l8 5" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10', className)}>{children}</div>;
}
