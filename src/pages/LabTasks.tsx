import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import { Page } from '../components/Layout';
import { Badge, Button, Card, SectionTitle, cx } from '../components/ui';
import { TASKS, TOPIC_LABELS, checkTask, type MathTask, type TaskAnswer } from '../core/tasks';
import { kvGet, kvSet } from '../store/db';

interface Progress {
  [id: string]: { status: 'correct' | 'wrong'; attempts: number };
}

const emptyAnswer = (t: MathTask): TaskAnswer => (t.type === 'number' ? { kind: 'number', value: '' } : t.type === 'hm' ? { kind: 'hm', hours: '', minutes: '' } : { kind: 'choice', index: null });

export default function LabTasks() {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState<Progress>({});
  const [answers, setAnswers] = useState<Record<string, TaskAnswer>>({});
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | 'invalid' | undefined>>({});
  const [hint, setHint] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kvGet<Progress>('tasks.progress').then((p) => {
      if (p) setProgress(p);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void kvSet('tasks.progress', progress);
  }, [progress, loaded]);

  const t = TASKS[idx];
  const ans = answers[t.id] ?? emptyAnswer(t);
  const fb = feedback[t.id];
  const solved = Object.values(progress).filter((p) => p.status === 'correct').length;

  const check = () => {
    const st = checkTask(t, ans);
    setFeedback((f) => ({ ...f, [t.id]: st }));
    if (st === 'invalid') return;
    setProgress((p) => ({ ...p, [t.id]: { status: p[t.id]?.status === 'correct' ? 'correct' : st, attempts: (p[t.id]?.attempts ?? 0) + 1 } }));
  };
  const retry = () => {
    setAnswers((a) => ({ ...a, [t.id]: emptyAnswer(t) }));
    setFeedback((f) => ({ ...f, [t.id]: undefined }));
  };

  return (
    <Page>
      <SectionTitle eyebrow="5-зертхана" title="15 интерактивті есеп" lead="Сағат пен минутты айналдыру, аралық ұзақтығы, қосу, азайту, қалған уақыт, салыстыру және қатені табу. Әр есептің жауабы тексеріледі, түсіндірмесі бар және қайта шешуге болады." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold">Прогресс</span>
            <span className="font-mono text-sm tnum">
              {solved}/15
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-soft-2" role="progressbar" aria-valuemin={0} aria-valuemax={15} aria-valuenow={solved} aria-label="Шешілген есептер">
            <motion.div className="h-full rounded-full bg-teal" animate={{ width: `${(solved / 15) * 100}%` }} />
          </div>
          <ol className="grid grid-cols-5 gap-1.5">
            {TASKS.map((x, i) => {
              const st = progress[x.id]?.status;
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setIdx(i)} aria-current={i === idx ? 'step' : undefined} aria-label={`${i + 1}-есеп${st === 'correct' ? ', шешілді' : st === 'wrong' ? ', қате болды' : ''}`} className={cx('grid h-10 w-full place-items-center rounded-lg border font-mono text-sm font-semibold transition-colors', i === idx ? 'border-brand ring-2 ring-brand/30' : 'border-line', st === 'correct' ? 'bg-ok-50 text-ok' : st === 'wrong' ? 'bg-danger-50 text-danger' : 'bg-white text-ink-2')}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <Button size="sm" variant="ghost" className="mt-4 w-full" onClick={() => { setProgress({}); setAnswers({}); setFeedback({}); }}>
            <RotateCcw size={14} /> Прогресті тазалау
          </Button>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{idx + 1}-есеп</Badge>
            <Badge>{TOPIC_LABELS[t.topic]}</Badge>
            {progress[t.id] && <span className="text-xs text-ink-3">талпыныс: {progress[t.id].attempts}</span>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={t.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              <h2 className="font-display text-2xl font-semibold leading-snug sm:text-[28px]">{t.question}</h2>
              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  check();
                }}
              >
                {t.type === 'number' && ans.kind === 'number' && (
                  <div className="flex items-center gap-3">
                    <input autoFocus inputMode="numeric" aria-label="Жауап" value={ans.value} onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: { kind: 'number', value: e.target.value } }))} className="h-14 w-40 rounded-xl border-2 border-line-2 bg-white px-4 text-right font-mono text-2xl tnum focus:border-brand" />
                    <span className="text-lg text-ink-2">{t.unit}</span>
                  </div>
                )}
                {t.type === 'hm' && ans.kind === 'hm' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <input autoFocus inputMode="numeric" aria-label="Сағат" value={ans.hours} onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: { ...ans, hours: e.target.value } }))} className="h-14 w-24 rounded-xl border-2 border-line-2 bg-white px-4 text-right font-mono text-2xl tnum focus:border-brand" />
                    <span className="text-lg text-ink-2">сағ</span>
                    <input inputMode="numeric" aria-label="Минут" value={ans.minutes} onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: { ...ans, minutes: e.target.value } }))} className="h-14 w-24 rounded-xl border-2 border-line-2 bg-white px-4 text-right font-mono text-2xl tnum focus:border-brand" />
                    <span className="text-lg text-ink-2">мин</span>
                  </div>
                )}
                {t.type === 'choice' && ans.kind === 'choice' && (
                  <div role="radiogroup" aria-label="Жауап нұсқалары" className="grid gap-2 sm:grid-cols-3">
                    {t.options.map((o, i) => (
                      <button key={o} type="button" role="radio" aria-checked={ans.index === i} onClick={() => setAnswers((a) => ({ ...a, [t.id]: { kind: 'choice', index: i } }))} className={cx('min-h-14 rounded-xl border-2 px-4 py-3 text-left text-[16px] font-medium transition-colors', ans.index === i ? 'border-brand bg-brand-50 text-brand' : 'border-line-2 bg-white hover:border-brand/50')}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button type="submit" variant="primary" size="lg">
                    Тексеру
                  </Button>
                  <Button size="lg" onClick={() => setHint((h) => ({ ...h, [t.id]: !h[t.id] }))} aria-expanded={!!hint[t.id]}>
                    <Lightbulb size={17} /> Көмек
                  </Button>
                  {fb && fb !== 'invalid' && (
                    <Button size="lg" variant="ghost" onClick={retry}>
                      <RotateCcw size={16} /> Қайта шешу
                    </Button>
                  )}
                </div>
              </form>
              {hint[t.id] && <p className="mt-4 rounded-xl border border-amber/30 bg-amber-50 px-4 py-3 text-[15px]">{t.hint}</p>}
              <div aria-live="polite">
                {fb === 'invalid' && <p className="mt-4 text-[15px] text-amber-700">Жауапты сан түрінде енгізіңіз (немесе нұсқаны таңдаңыз).</p>}
                {fb === 'correct' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex gap-3 rounded-xl border border-ok/25 bg-ok-50 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-ok" />
                    <div>
                      <div className="font-semibold text-ok">Дұрыс!</div>
                      <div className="mt-0.5 font-mono text-[15px]">{t.explanation}</div>
                    </div>
                  </motion.div>
                )}
                {fb === 'wrong' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex gap-3 rounded-xl border border-danger/25 bg-danger-50 px-4 py-3">
                    <XCircle className="mt-0.5 shrink-0 text-danger" />
                    <div>
                      <div className="font-semibold text-danger">Әзірге дұрыс емес</div>
                      {(progress[t.id]?.attempts ?? 0) >= 2 ? (
                        <div className="mt-0.5 text-[15px]">Түсіндірме: <span className="font-mono">{t.explanation}</span></div>
                      ) : (
                        <div className="mt-0.5 text-[15px]">Кеңес: {t.hint}</div>
                      )}
                      <div className="mt-1 text-sm text-ink-3">«Қайта шешу» батырмасын басып, тағы да көр.{(progress[t.id]?.attempts ?? 0) < 2 && ' Екінші қатеден кейін толық түсіндірме ашылады.'}</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-between border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
              <ChevronLeft size={17} /> Алдыңғы
            </Button>
            <Button variant="ghost" onClick={() => setIdx((i) => Math.min(TASKS.length - 1, i + 1))} disabled={idx === TASKS.length - 1}>
              Келесі <ChevronRight size={17} />
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
