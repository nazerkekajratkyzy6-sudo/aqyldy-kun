import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import { KidShell, NumPad, BigButton } from './ui';
import { ArtMath } from './illustrations';
import { TaskVisualView } from './clocks';
import { LEVELS, TASKS, checkTask, type MathTask, type TaskAnswer } from '../core/tasks';
import { kvGet, kvSet } from '../store/db';
import { cx } from '../components/ui';

type Progress = Record<string, { status: 'correct' | 'wrong'; attempts: number }>;

const empty = (t: MathTask): TaskAnswer => (t.type === 'number' ? { kind: 'number', value: '' } : t.type === 'hm' ? { kind: 'hm', hours: '', minutes: '' } : { kind: 'choice', index: null });

export default function MathPractice() {
  const nav = useNavigate();
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState<Progress>({});
  const [ans, setAns] = useState<TaskAnswer | null>(null);
  const [fb, setFb] = useState<'correct' | 'wrong' | 'invalid' | null>(null);
  const [hint, setHint] = useState(false);
  const [field, setField] = useState<'hours' | 'minutes'>('hours');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kvGet<Progress>('kid.math').then((p) => {
      if (p) setProgress(p);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void kvSet('kid.math', progress);
  }, [progress, loaded]);

  const tasks = level ? TASKS.filter((t) => t.level === level) : [];
  const t = tasks[i];
  useEffect(() => {
    if (t) {
      setAns(empty(t));
      setFb(null);
      setHint(false);
      setField('hours');
    }
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const solvedIn = (l: number) => TASKS.filter((x) => x.level === l && progress[x.id]?.status === 'correct').length;

  if (!level || !t || !ans) {
    return (
      <KidShell section="/math" title="Уақыт математикасы" art={<ArtMath size={72} />} instruction="Деңгейді таңда. Әр деңгейде 5 есеп бар.">
        <div className="grid gap-4 md:grid-cols-3">
          {LEVELS.map((l) => (
            <button key={l.n} type="button" onClick={() => { setLevel(l.n); setI(0); }} className="flex flex-col rounded-3xl border-2 border-line bg-white p-6 text-left hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-brand">{l.n}-деңгей</span>
              <span className="mt-1 font-display text-2xl font-semibold">{l.title}</span>
              <span className="mt-2 text-[17px] text-ink-2">{l.desc}</span>
              <span className="mt-4 flex items-center gap-1.5" aria-label={`${solvedIn(l.n)} есеп шешілді`}>
                {TASKS.filter((x) => x.level === l.n).map((x) => (
                  <span key={x.id} className={cx('h-2.5 flex-1 rounded-full', progress[x.id]?.status === 'correct' ? 'bg-teal' : 'bg-line')} />
                ))}
              </span>
              <span className="mt-2 text-sm text-ink-3">Шешілді: {solvedIn(l.n)}/5</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-[15px] text-ink-3">Бұл — математикалық жаттығу. Ұпай мен жүлде жоқ: қатені түзетіп, түсіндірмені оқы.</p>
      </KidShell>
    );
  }

  const attempts = progress[t.id]?.attempts ?? 0;
  const check = () => {
    const st = checkTask(t, ans);
    setFb(st);
    if (st === 'invalid') return;
    setProgress((p) => ({ ...p, [t.id]: { status: p[t.id]?.status === 'correct' ? 'correct' : st, attempts: (p[t.id]?.attempts ?? 0) + 1 } }));
  };
  const retry = () => {
    setAns(empty(t));
    setFb(null);
  };
  const lvl = LEVELS[level - 1];
  const goNext = () => {
    if (i < 4) setI(i + 1);
    else if (level < 3) {
      setLevel((level + 1) as 2 | 3);
      setI(0);
    } else nav('/research');
  };
  const goBack = () => {
    if (i > 0) setI(i - 1);
    else setLevel(null);
  };
  const numVal = ans.kind === 'number' ? ans.value : ans.kind === 'hm' ? (field === 'hours' ? ans.hours : ans.minutes) : '';
  const setNum = (v: string) => {
    if (ans.kind === 'number') setAns({ kind: 'number', value: v });
    else if (ans.kind === 'hm') setAns({ ...ans, [field]: v });
    setFb(null);
  };

  return (
    <KidShell section="/math" title={`Уақыт математикасы · ${lvl.n}-деңгей`} art={<ArtMath size={72} />} step={{ n: i + 1, total: 5, label: `${lvl.n}-деңгей: ${lvl.title}` }} instruction="Шартты оқы, суретке қара, жауабыңды енгіз." onBack={goBack} onNext={goNext} backLabel={i === 0 ? 'Деңгейлер' : 'Артқа'} nextLabel={i < 4 ? 'Келесі есеп' : level < 3 ? 'Келесі деңгей' : 'Келесі'}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-5">
          <h2 className="font-display text-[26px] font-semibold leading-snug sm:text-3xl">{t.question}</h2>
          <div className="flex min-h-48 items-center justify-center rounded-3xl border-2 border-line bg-soft/60 p-5">
            <TaskVisualView v={t.visual} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          {t.type === 'choice' && ans.kind === 'choice' ? (
            <div role="radiogroup" aria-label="Жауап нұсқалары" className="grid w-full gap-3">
              {t.options.map((o, k) => (
                <button key={o} type="button" role="radio" aria-checked={ans.index === k} onClick={() => { setAns({ kind: 'choice', index: k }); setFb(null); }} className={cx('min-h-16 rounded-2xl border-2 px-5 text-left text-xl font-semibold', ans.index === k ? 'border-brand bg-brand-50 text-brand' : 'border-line-2 bg-white hover:border-brand/50')}>
                  {o}
                </button>
              ))}
              <BigButton onClick={check}>Тексеру</BigButton>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3">
                {ans.kind === 'number' ? (
                  <>
                    <div className="grid h-20 min-w-40 place-items-center rounded-2xl border-[3px] border-brand bg-white px-4 font-mono text-5xl font-semibold tnum" aria-live="polite" aria-label="Жауап">
                      {ans.value || <span className="text-line-2">?</span>}
                    </div>
                    <span className="pb-2 text-2xl text-ink-2">{t.type === 'number' ? t.unit : ''}</span>
                  </>
                ) : ans.kind === 'hm' ? (
                  <>
                    {(['hours', 'minutes'] as const).map((f) => (
                      <button key={f} type="button" onClick={() => setField(f)} aria-pressed={field === f} className="flex flex-col items-center">
                        <span className={cx('grid h-20 w-28 place-items-center rounded-2xl border-[3px] bg-white font-mono text-5xl font-semibold tnum', field === f ? 'border-brand' : 'border-line-2')}>{ans[f] || <span className="text-line-2">?</span>}</span>
                        <span className="mt-1 text-lg text-ink-2">{f === 'hours' ? 'сағат' : 'минут'}</span>
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
              <NumPad value={numVal} onChange={setNum} onEnter={check} />
            </>
          )}
          <button type="button" onClick={() => setHint((h) => !h)} className="inline-flex items-center gap-2 text-[16px] font-semibold text-amber-700">
            <Lightbulb size={18} /> {hint ? 'Кеңесті жабу' : 'Кеңес керек'}
          </button>
          {hint && <p className="w-full rounded-2xl border-2 border-amber/30 bg-amber-50 px-4 py-3 text-[17px]">{t.hint}</p>}
        </div>
      </div>

      <div aria-live="polite" className="mt-6">
        {fb === 'invalid' && <p className="text-lg text-amber-700">Алдымен жауапты енгіз немесе нұсқаны таңда.</p>}
        {fb === 'correct' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-2 border-ok/30 bg-ok-50 p-5">
            <div className="flex items-center gap-2 text-2xl font-semibold text-ok">
              <CheckCircle2 size={28} /> Дұрыс!
            </div>
            <Steps steps={t.steps} />
          </motion.div>
        )}
        {fb === 'wrong' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-2 border-coral/40 bg-[#FFF1EC] p-5">
            <div className="flex items-center gap-2 text-2xl font-semibold text-[#C2410C]">
              <XCircle size={28} /> Әзірге дұрыс емес
            </div>
            {attempts >= 2 ? (
              <>
                <p className="mt-2 text-[17px]">Шешу жолын қадам бойынша қара:</p>
                <Steps steps={t.steps} />
              </>
            ) : (
              <p className="mt-2 text-[17px]">Кеңес: {t.hint}</p>
            )}
            <BigButton variant="secondary" className="mt-4" icon={<RotateCcw size={18} />} onClick={retry}>
              Қатені түзету
            </BigButton>
          </motion.div>
        )}
      </div>
    </KidShell>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((s, k) => (
        <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.35 }} className="flex items-start gap-3 text-[18px]">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-mono text-base font-semibold text-ink-2 shadow-sm">{k + 1}</span>
          <span className="pt-0.5 font-mono">{s}</span>
        </motion.li>
      ))}
    </ol>
  );
}
