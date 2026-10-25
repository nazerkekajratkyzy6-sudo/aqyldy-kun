import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Page } from '../components/Layout';
import { SectionTitle, cx } from '../components/ui';

const EXPS = [
  { n: 1, title: 'Экран және қалған уақыт', C: lazy(() => import('../experiments/Exp1')) },
  { n: 2, title: 'Кітап, үй тапсырмасы, демалыс', C: lazy(() => import('../experiments/Exp2')) },
  { n: 3, title: 'Жоспар және факт', C: lazy(() => import('../experiments/Exp3')) },
  { n: 4, title: 'Уақыт тапшылығы', C: lazy(() => import('../experiments/Exp4')) },
  { n: 5, title: 'Өз жоспары және көмекші', C: lazy(() => import('../experiments/Exp5')) },
];

export default function LabExperiments() {
  const [sp, setSp] = useSearchParams();
  const n = Math.min(5, Math.max(1, Number(sp.get('e')) || 1));
  const E = EXPS[n - 1];
  return (
    <Page>
      <SectionTitle eyebrow="3-зертхана" title="Бес қайталанатын эксперимент" lead="Әр эксперимент бірдей құрылымда: мақсат, бастапқы деректер, өзгертілетін параметрлер, есептеу, график, салыстыру, қорытынды және сақтау. Бастапқы мәндер зерттеу жұмысының үлгі деректерінен алынған және солай белгіленген." />
      <div role="tablist" aria-label="Эксперименттер" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {EXPS.map((e) => (
          <button
            key={e.n}
            role="tab"
            aria-selected={e.n === n}
            onClick={() => setSp({ e: String(e.n) }, { replace: true })}
            className={cx('shrink-0 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors', e.n === n ? 'border-brand bg-brand-50 text-brand' : 'border-line bg-white text-ink-2 hover:border-line-2')}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-75">{e.n}-эксперимент</span>
            <span className="font-semibold">{e.title}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={n} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="tabpanel">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-soft" />}>
            <E.C />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Page>
  );
}
