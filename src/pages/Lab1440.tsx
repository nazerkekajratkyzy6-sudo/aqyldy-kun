import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock3, Plus, RotateCcw, Save, Trash2, FolderOpen } from 'lucide-react';
import { Page } from '../components/Layout';
import { DayRing } from '../components/DayRing';
import { Button, Callout, Card, CardHeader, DataBadge, Formula, MinutesInput, SectionTitle, Slider, Stat, inputCls, cx } from '../components/ui';
import { setActivityMinutes, summarize, type Activity } from '../core/budget';
import { CATEGORY_LABELS, type Category } from '../core/intervals';
import { MINUTES_PER_DAY, formatDuration } from '../core/time';
import { fmtNumber, uid } from '../core/format';
import { CATEGORY_COLORS } from '../lib/palette';
import { PROJECT } from '../data/research';
import { useAppData, useSavedList } from '../store/AppData';
import { kvGet, kvSet } from '../store/db';

type Act = Activity & { category: Category };

/** Мысал сценарий: Қосымша 1 кестесінің аралықтары + ұйқы (мысал мән). */
export const EXAMPLE_ACTIVITIES: Act[] = [
  { id: 'sleep', name: 'Ұйқы', minutes: 600, useful: false, color: CATEGORY_COLORS.sleep, category: 'sleep' },
  { id: 'morning', name: 'Таңғы дайындық', minutes: 30, useful: false, color: CATEGORY_COLORS.morning, category: 'morning' },
  { id: 'school', name: 'Мектеп', minutes: 300, useful: false, color: CATEGORY_COLORS.school, category: 'school' },
  { id: 'rest', name: 'Демалыс/тамақ', minutes: 60, useful: false, color: CATEGORY_COLORS.rest, category: 'rest' },
  { id: 'homework', name: 'Үй тапсырмасы', minutes: 60, useful: true, color: CATEGORY_COLORS.homework, category: 'homework' },
  { id: 'movement', name: 'Қозғалыс', minutes: 30, useful: false, color: CATEGORY_COLORS.movement, category: 'movement' },
  { id: 'reading', name: 'Кітап/қызығушылық', minutes: 30, useful: true, color: CATEGORY_COLORS.reading, category: 'reading' },
  { id: 'free', name: 'Еркін уақыт', minutes: 60, useful: false, color: CATEGORY_COLORS.free, category: 'free' },
];

const isExample = (list: Act[]) => JSON.stringify(list.map((a) => [a.id, a.minutes, a.useful, a.name])) === JSON.stringify(EXAMPLE_ACTIVITIES.map((a) => [a.id, a.minutes, a.useful, a.name]));

export default function Lab1440() {
  const { toast } = useAppData();
  const [list, setList] = useState<Act[]>(EXAMPLE_ACTIVITIES);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const [name, setName] = useState('');
  const saved = useSavedList<Act[]>('scenarios');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kvGet<Act[]>('lab1440.current').then((v) => {
      if (Array.isArray(v) && v.length) setList(v);
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void kvSet('lab1440.current', list);
  }, [list, loaded]);

  const s = useMemo(() => summarize(list), [list]);
  const demo = isExample(list);

  const change = (id: string, v: number) => {
    const r = setActivityMinutes(list, id, v);
    setList(r.list as Act[]);
    if (r.clamped === 'overflow') setNotice({ id, text: `Тәулік 1440 минуттан аспайды. Бұл әрекетке ең көбі 1440 − ${fmtNumber(MINUTES_PER_DAY - r.max, 0)} = ${r.max} мин беруге болады. Басқа әрекеттер өзгертілмеді.` });
    else if (r.clamped === 'negative') setNotice({ id, text: 'Уақыт теріс бола алмайды — мән 0-ге теңестірілді.' });
    else setNotice(null);
  };

  const addActivity = (category: Category) => {
    setList((l) => [...l, { id: uid('act'), name: CATEGORY_LABELS[category], minutes: 0, useful: category === 'homework' || category === 'reading', color: CATEGORY_COLORS[category], category }]);
  };

  const sumExpr = list.filter((a) => a.minutes > 0).map((a) => a.minutes).join(' + ') || '0';
  const usefulExpr = list.filter((a) => a.useful && a.minutes > 0).map((a) => a.minutes).join(' + ') || '0';

  return (
    <Page>
      <SectionTitle eyebrow="1-зертхана" title="1440 минут: тәулікті бөлу" lead="Әр әрекеттің уақытын енгіз немесе сырғытпамен өзгерт. Қосынды, пайыздар және қалған уақыт бірден қайта есептеледі. Бір әрекетті өзгерту басқа әрекеттерді автоматты түрде өзгертпейді." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <DataBadge kind={demo ? 'demo' : 'edited'} />
        <span className="text-sm text-ink-3">{demo ? 'Мысал: Қосымша 1 кестесінің аралықтары; ұйқы мәні — мысал. Өз мәніңді енгіз.' : 'Бұл — модельдеу сценарийі, бақылау дерегі емес.'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader title="Әрекеттер" subtitle="Tᵢ — i-әрекетке бөлінген минут" icon={<Clock3 size={18} />} actions={<Button size="sm" variant="ghost" onClick={() => { setList(EXAMPLE_ACTIVITIES); setNotice(null); }}><RotateCcw size={15} /> Мысалға қайтару</Button>} />
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {list.map((a) => {
                const max = a.minutes + Math.max(0, s.remainder);
                return (
                  <motion.li key={a.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="size-3.5 shrink-0 rounded-[4px]" style={{ background: a.color }} aria-hidden />
                      <input aria-label="Әрекет атауы" value={a.name} onChange={(e) => setList((l) => l.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))} className="min-w-[9rem] flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-line focus:border-brand" />
                      <MinutesInput value={a.minutes} onChange={(v) => change(a.id, v)} label={a.name} max={max} compact />
                      <span className="w-16 text-right font-mono text-sm text-ink-3 tnum">{fmtNumber(s.percents[a.id] ?? 0)}%</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 pl-6">
                      <div className="flex-1">
                        <Slider value={a.minutes} max={MINUTES_PER_DAY} step={5} onChange={(v) => change(a.id, v)} color={a.color} label={`${a.name}, минут`} valueText={`${a.minutes} минут`} />
                      </div>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-2">
                        <input type="checkbox" checked={a.useful} onChange={(e) => setList((l) => l.map((x) => (x.id === a.id ? { ...x, useful: e.target.checked } : x)))} className="size-4 accent-[#2563EB]" />
                        пайдалы
                      </label>
                      <button type="button" aria-label={`${a.name} жою`} onClick={() => setList((l) => l.filter((x) => x.id !== a.id))} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-danger-50 hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-1 pl-6 text-xs text-ink-3">
                      {formatDuration(a.minutes)} · шегі {max} мин
                    </div>
                    {notice?.id === a.id && (
                      <Callout tone="warn" className="mt-2 ml-6">
                        {notice.text}
                      </Callout>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
            <span className="text-sm text-ink-3">Әрекет қосу:</span>
            {(['homework', 'reading', 'movement', 'screen', 'food', 'other'] as Category[]).map((c) => (
              <Button key={c} size="sm" variant="secondary" onClick={() => addActivity(c)}>
                <Plus size={14} /> {CATEGORY_LABELS[c]}
              </Button>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <DayRing
              segments={list.map((a) => ({ id: a.id, label: a.name, minutes: a.minutes, color: a.color }))}
              size={320}
              center={
                <>
                  <div className="text-sm text-ink-3">Қалған уақыт R</div>
                  <div className={cx('font-display text-4xl font-semibold tnum', s.remainder === 0 ? 'text-amber-700' : 'text-teal')}>{fmtNumber(s.remainder, 0)}</div>
                  <div className="text-xs text-ink-3">мин · {formatDuration(s.remainder)}</div>
                </>
              }
            />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="ΣTᵢ" value={s.total} unit="мин" />
              <Stat label="R" value={s.remainder} unit="мин" tone="teal" />
              <Stat label="K" value={s.efficiencyK} unit="%" digits={1} tone="brand" />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-display text-lg font-semibold">Есептеу жолы</h3>
            <div className="space-y-3">
              <Formula label="Қосынды">ΣTᵢ = {sumExpr} = {s.total} мин</Formula>
              <Formula label="Қалған уақыт">R = 1440 − {s.total} = {s.remainder} мин</Formula>
              <Formula label="Тиімділік коэффициенті (шартты)">
                K = ({usefulExpr}) / 1440 × 100% = {s.usefulTotal} / 1440 × 100% ≈ {fmtNumber(s.efficiencyK)}%
              </Formula>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">{PROJECT.kNote}</p>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 font-display text-lg font-semibold">Айнымалылар</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="font-mono font-semibold">Tᵢ</dt>
              <dd className="text-ink-2">i-әрекетке бөлінген уақыт, минутпен</dd>
              <dt className="font-mono font-semibold">ΣTᵢ</dt>
              <dd className="text-ink-2">барлық әрекеттің қосындысы</dd>
              <dt className="font-mono font-semibold">R</dt>
              <dd className="text-ink-2">қалған (бос немесе резервтік) уақыт; R ≥ 0 болуы шарт</dd>
              <dt className="font-mono font-semibold">%</dt>
              <dd className="text-ink-2">Tᵢ / 1440 × 100 — тәуліктің қанша бөлігі</dd>
              <dt className="font-mono font-semibold">K</dt>
              <dd className="text-ink-2">«пайдалы» деп белгіленген уақыттың тәуліктегі үлесі</dd>
            </dl>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Сценарийлерді сақтау" subtitle="Құрылғыдағы IndexedDB-ге сақталады" icon={<Save size={18} />} />
        <div className="flex flex-col gap-4 p-5">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const n = name.trim() || `Сценарий ${new Date().toLocaleString('kk-KZ')}`;
              await saved.save(n, list);
              setName('');
              toast('Сценарий сақталды');
            }}
          >
            <input className={cx(inputCls, 'max-w-sm')} placeholder="Сценарий атауы (мыс. «Оқу күні»)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Сценарий атауы" />
            <Button type="submit" variant="primary">
              <Save size={16} /> Сақтау
            </Button>
          </form>
          {saved.items.length === 0 ? (
            <p className="text-sm text-ink-3">Әзірге сақталған сценарий жоқ.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {saved.items.map((it) => {
                const sm = summarize(it.data);
                return (
                  <li key={it.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-xs text-ink-3">
                        ΣT = {sm.total} мин · R = {sm.remainder} мин
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" aria-label={`${it.name} ашу`} onClick={() => { setList(it.data); setNotice(null); toast('Сценарий жүктелді', 'info'); }}>
                        <FolderOpen size={15} />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`${it.name} жою`} onClick={() => saved.del(it.id)}>
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </Page>
  );
}
