import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Brain, Calculator, CalendarClock, FlaskConical, Target, Lightbulb, HelpCircle, Microscope } from 'lucide-react';
import { HourGrid } from '../components/HourGrid';
import { LABS, Page } from '../components/Layout';
import { Card, Formula } from '../components/ui';
import { PROJECT } from '../data/research';
import { useAppData } from '../store/AppData';

export default function Home() {
  const { author } = useAppData();
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <Page className="relative pb-12 pt-10 sm:pt-14">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand">Ересектерге: толық зертхана</div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-ink-2">
                <Microscope size={15} className="text-teal" aria-hidden /> {PROJECT.contest.replace('республикалық зерттеу жобалары мен шығармашылық жұмыстарының конкурсы', 'конкурсы')} · {PROJECT.section}
              </div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
                Ақылды күн <span className="text-brand">тәртібі</span>
              </motion.h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">Математика және ЖИ арқылы оқушының уақытын тиімді пайдалану: тәулікті минутпен есептеп, жоспарды алгоритммен реттеп, нәтижені өз бақылауыңмен тексер.</p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-[15px] font-medium">
                {[
                  { icon: Calculator, t: 'Математика', c: 'text-brand bg-brand-50' },
                  { icon: CalendarClock, t: 'Жоспарлау', c: 'text-teal bg-teal-50' },
                  { icon: Brain, t: 'ЖИ-көмекші', c: 'text-amber-700 bg-amber-50' },
                ].map((x, i) => (
                  <span key={x.t} className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${x.c}`}>
                      <x.icon size={16} aria-hidden /> {x.t}
                    </span>
                    {i < 2 && <ArrowRight size={16} className="text-ink-3" aria-hidden />}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/teacher/diary" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white shadow-sm hover:bg-brand-700">
                  Зерттеуді бастау <ArrowRight size={18} aria-hidden />
                </Link>
                <Link to="/teacher/1440" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-2 bg-white px-5 font-semibold hover:border-brand hover:text-brand">
                  <FlaskConical size={18} aria-hidden /> Математикалық зертхана
                </Link>
                <Link to="/teacher/analytics" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-2 bg-white px-5 font-semibold hover:border-teal hover:text-teal">
                  <BarChart3 size={18} aria-hidden /> Нәтижелерді көру
                </Link>
              </div>
              {author.student && (
                <p className="mt-6 text-sm text-ink-3">
                  Автор: {author.student}, {author.grade}. Ғылыми жетекші: {author.supervisor}.
                </p>
              )}
            </div>
            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">Тәулік моделі: 24 × 60 = 1440</h2>
                <span className="text-xs text-ink-3">шаршыны бас немесе жылжыт</span>
              </div>
              <HourGrid initial={180} compact />
            </Card>
          </div>
        </Page>
      </section>

      <Page>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Target, title: 'Мақсат', text: PROJECT.goal },
            { icon: HelpCircle, title: 'Мәселе', text: PROJECT.problem },
            { icon: Lightbulb, title: 'Болжам', text: PROJECT.hypothesis },
            { icon: Microscope, title: 'Әдістер', text: PROJECT.methods.join(', ') + '.' },
          ].map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand">
                    <b.icon size={18} aria-hidden />
                  </span>
                  <h2 className="font-display text-lg font-semibold">{b.title}</h2>
                </div>
                <p className="text-[15px] leading-relaxed text-ink-2">{b.text}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Модельдің негізгі формулалары</h2>
            <p className="mt-1 text-sm text-ink-3">Барлық есеп минутпен жүргізіледі.</p>
            <div className="mt-4 space-y-3">
              <Formula label="Тәулік">1 тәулік = 24 × 60 = 1440 мин</Formula>
              <Formula label="Қалған (резерв) уақыт">R = 1440 − ΣTᵢ</Formula>
              <Formula label="Жоспар мен факт айырмасы">Δ = факт − жоспар</Formula>
              <Formula label="Орташа мән">M = Σxᵢ / n</Formula>
              <Formula label="Пайыздық өзгеріс (A ≠ 0)">P = (B − A) / A × 100%</Formula>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Қағида: {PROJECT.principle}. Уақытты тиімді пайдалану — барлық минутты сабаққа толтыру емес: демалыс пен ұйқы да күн тәртібінің қажетті бөлігі.
            </p>
          </Card>
          <div>
            <h2 className="mb-4 font-display text-xl font-semibold">Алты зертхана</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {LABS.map((l) => (
                <Link key={l.to} to={l.to} className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-soft-2 text-ink-2 transition-colors group-hover:bg-brand group-hover:text-white">
                      <l.icon size={19} aria-hidden />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-ink-3">{l.n}-зертхана</div>
                      <div className="font-semibold">{l.label}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-3">{l.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}
