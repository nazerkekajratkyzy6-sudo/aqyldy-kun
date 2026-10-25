import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Minus, Plus, Clock3, Presentation } from 'lucide-react';
import { Logo } from '../components/Layout';
import { Dial24 } from './clocks';
import { ArtExperiment, ArtHelper, ArtMath, ArtMyDay, ArtResearch, ArtResults, ArtShow } from './illustrations';
import { cx } from '../components/ui';
import { PROJECT } from '../data/research';
import { useAppData } from '../store/AppData';

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export default function KidHome() {
  const { author } = useAppData();
  const [live, setLive] = useState(true);
  const [minutes, setMinutes] = useState(nowMinutes);
  useEffect(() => {
    if (!live) return;
    setMinutes(nowMinutes());
    const t = setInterval(() => setMinutes(nowMinutes()), 20000);
    return () => clearInterval(t);
  }, [live]);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const shift = (d: number) => {
    setLive(false);
    setMinutes((x) => Math.min(1440, Math.max(0, x + d)));
  };

  const MAIN = [
    { to: '/my-day', title: 'Менің күнім', desc: 'Өз күніңді құр', Art: ArtMyDay, tint: 'bg-[#EEF4FF]' },
    { to: '/experiments', title: 'Тәжірибе', desc: 'Математикалық тәжірибе жаса', Art: ArtExperiment, tint: 'bg-[#E9FAF6]' },
    { to: '/helper', title: 'Ақылды көмекші', desc: 'Жоспарыңды жақсарт', Art: ArtHelper, tint: 'bg-[#F3FBE6]' },
    { to: '/results', title: 'Нәтижем', desc: 'Зерттеу нәтижесін көр', Art: ArtResults, tint: 'bg-[#FFF7E6]' },
  ];
  const MORE = [
    { to: '/math', title: 'Уақыт математикасы', desc: '15 есеп, 3 деңгей', Art: ArtMath },
    { to: '/research', title: 'Менің зерттеуім', desc: 'Күнделік: 5–14 күн', Art: ArtResearch },
    { to: '/show', title: 'Жобамды көрсетемін', desc: 'Қорғау режимі', Art: ArtShow },
  ];

  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-[0.06em]">AQYLDY KÜN</div>
          <div className="text-xs text-ink-3">«Зерде» · ғылыми зертхана</div>
        </div>
        <Link to="/show" className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border-2 border-line-2 px-3 text-[15px] font-semibold hover:border-brand hover:text-brand">
          <Presentation size={18} /> <span className="hidden sm:inline">Жобамды көрсетемін</span>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[40px] font-semibold leading-[1.05] sm:text-6xl" style={{ textWrap: 'balance' }}>
              Ақылды күн <span className="text-brand">тәртібі</span>
            </motion.h1>
            <p className="mt-3 max-w-xl text-xl leading-relaxed text-ink-2">«Математика және жасанды интеллект арқылы уақытты тиімді жоспарлау»</p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-2xl border-2 border-teal/25 bg-teal-50 px-4 py-3 font-mono text-xl font-semibold sm:text-2xl">
              <span>1 тәулік</span>
              <span className="text-ink-3">=</span>
              <span>24 сағат</span>
              <span className="text-ink-3">=</span>
              <span className="text-teal">1440 минут</span>
            </div>
            <p className="mt-4 hidden max-w-lg text-[17px] text-ink-2 sm:block">Сағаттағы жасыл доға — тәуліктің өткен бөлігі. Батырмалармен сағатты айналдырып, минуттарды есепте.</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Dial24
              minutes={minutes}
              size={360}
              center={
                <>
                  <div className="font-display text-[44px] font-semibold leading-none tnum">1440</div>
                  <div className="text-sm text-ink-3">минут тәулікте</div>
                </>
              }
            />
            <div className="grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-3">
              <button type="button" onClick={() => shift(-60)} aria-label="1 сағат кері" className="grid size-14 place-items-center rounded-2xl border-2 border-line-2 hover:border-brand">
                <Minus size={22} />
              </button>
              <div className="text-center" aria-live="polite">
                <div className="font-mono text-lg">
                  {h} × 60 + {m} = <b className="text-teal">{minutes}</b> мин өтті
                </div>
                <div className="font-mono text-lg">
                  1440 − {minutes} = <b className="text-brand">{1440 - minutes}</b> мин қалды
                </div>
              </div>
              <button type="button" onClick={() => shift(60)} aria-label="1 сағат алға" className="grid size-14 place-items-center rounded-2xl border-2 border-line-2 hover:border-brand">
                <Plus size={22} />
              </button>
            </div>
            <button type="button" onClick={() => setLive(true)} className={cx('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold', live ? 'bg-teal-50 text-teal' : 'bg-soft-2 text-ink-2 hover:text-brand')}>
              <Clock3 size={16} /> {live ? `Қазір: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : 'Қазіргі уақытқа қайту'}
            </button>
          </div>
        </div>

        <nav aria-label="Негізгі бөлімдер" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MAIN.map((b, i) => (
            <motion.div key={b.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
              <Link to={b.to} className="group flex h-full flex-col rounded-3xl border-2 border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
                <span className={cx('grid size-24 place-items-center rounded-2xl', b.tint)}>
                  <b.Art size={76} />
                </span>
                <span className="mt-4 flex items-center gap-2 font-display text-[22px] font-semibold leading-tight">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-base text-white">{i + 1}</span>
                  {b.title}
                </span>
                <span className="mt-1 text-[17px] text-ink-2">{b.desc}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[15px] font-semibold text-brand">
                  Бастау <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </nav>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {MORE.map((b) => (
            <Link key={b.to} to={b.to} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-soft/50 p-3 hover:border-brand">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white">
                <b.Art size={46} />
              </span>
              <span>
                <span className="block text-[17px] font-semibold">{b.title}</span>
                <span className="block text-sm text-ink-3">{b.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <footer className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {PROJECT.fullTitle}
            {author.student ? ` · ${author.student}, ${author.grade}` : ''}
          </span>
          <Link to="/teacher" className="font-semibold text-ink-2 underline underline-offset-4 hover:text-brand">
            Ересектерге: толық зертхана
          </Link>
        </footer>
      </section>
    </div>
  );
}
