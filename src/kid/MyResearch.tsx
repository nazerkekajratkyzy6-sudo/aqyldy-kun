import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Pencil, Trash2, ChevronDown, Download, Upload, User, Bot } from 'lucide-react';
import { KidShell, BigButton, SourceTag, ResultMessage } from './ui';
import { ArtResearch, Homework, Screen, Reading, Movement, Free } from './illustrations';
import { METRICS, METRIC_LABELS, emptyEntry, makeExport, parseImport, type DiaryEntry, type Metric } from '../core/diary';
import { fmtDate, todayISO, uid } from '../core/format';
import { SAMPLE_DIARY, sampleDayLabel } from '../data/research';
import { useAppData } from '../store/AppData';
import { downloadText } from '../lib/download';
import { cx } from '../components/ui';

const ART: Record<Metric, (p: { size?: number }) => JSX.Element> = { homework: Homework, screen: Screen, reading: Reading, movement: Movement, unplanned: Free };
const KID_METRIC: Record<Metric, string> = { homework: 'Үй тапсырмасы', screen: 'Экран', reading: 'Кітап оқу', movement: 'Қозғалыс', unplanned: 'Жоспардан тыс уақыт' };

export default function MyResearch() {
  const { mode, setMode, realEntries, saveEntry, deleteEntry, replaceEntries, protocol, setProtocol, toast } = useAppData();
  const [draft, setDraft] = useState<DiaryEntry | null>(null);
  const [step, setStep] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [adult, setAdult] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = protocol.targetDays;

  const openNew = (k: number) => {
    const used = new Set(realEntries.map((e) => e.date));
    let d = new Date();
    while (used.has(todayISO(d))) d = new Date(d.getTime() - 86400000);
    const half = Math.floor(target / 2);
    setDraft({ ...emptyEntry(uid('day'), todayISO(d)), phase: target >= 10 ? (k < half ? 'self' : 'assistant') : 'none' });
    setStep(1);
    setConfirm(false);
  };

  if (draft) {
    const isNew = !realEntries.some((e) => e.id === draft.id);
    const total = METRICS.reduce((s, m) => s + draft.fact[m], 0);
    return (
      <KidShell
        section="/research"
        title="Менің зерттеуім"
        art={<ArtResearch size={72} />}
        step={{ n: step, total: 2, label: step === 1 ? 'Қай күн?' : 'Қанша минут жұмсадың?' }}
        instruction={step === 1 ? 'Күнді және жоспарды кіммен құрғаныңды таңда.' : 'Әр іске нақты қанша минут кеткенін жаз.'}
        onBack={() => (step === 2 ? setStep(1) : setDraft(null))}
        backLabel={step === 1 ? 'Күндерге' : 'Артқа'}
        onNext={async () => {
          if (step === 1) return setStep(2);
          if (await saveEntry(draft)) {
            toast('Жазба сақталды');
            setDraft(null);
          }
        }}
        nextLabel={step === 1 ? 'Келесі' : 'Сақтау'}
        nextDisabled={total > 1440}
      >
        {step === 1 && (
          <div className="flex max-w-2xl flex-col gap-5">
            <label className="flex flex-col gap-2 text-lg font-semibold">
              Күні
              <input id="r-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="h-14 rounded-2xl border-2 border-line-2 px-4 font-mono text-xl" />
            </label>
            <div>
              <div className="mb-2 text-lg font-semibold">Бұл қандай күн?</div>
              <div className="grid grid-cols-2 gap-3">
                {(['school', 'weekend'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={draft.dayType === v} onClick={() => setDraft({ ...draft, dayType: v })} className={cx('min-h-16 rounded-2xl border-2 text-xl font-semibold', draft.dayType === v ? 'border-brand bg-brand-50 text-brand' : 'border-line-2')}>
                    {v === 'school' ? 'Оқу күні' : 'Демалыс күні'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-lg font-semibold">Бүгінгі жоспарды кіммен құрдың?</div>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['self', 'Өзім', <User key="u" size={22} />],
                    ['assistant', 'Көмекшімен', <Bot key="b" size={22} />],
                    ['none', 'Жоспар жоқ', null],
                  ] as const
                ).map(([v, l, ic]) => (
                  <button key={v} type="button" aria-pressed={draft.phase === v} onClick={() => setDraft({ ...draft, phase: v })} className={cx('flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[17px] font-semibold', draft.phase === v ? 'border-brand bg-brand-50 text-brand' : 'border-line-2')}>
                    {ic}
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {METRICS.map((m) => {
              const A = ART[m];
              const plan = m === 'unplanned' ? undefined : draft.plan[m];
              return (
                <div key={m} className="rounded-3xl border-2 border-line bg-white p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <A size={52} />
                    <span className="min-w-32 flex-1 text-lg font-semibold">{KID_METRIC[m]}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label={`${KID_METRIC[m]}: 5 минут азайту`} onClick={() => setDraft({ ...draft, fact: { ...draft.fact, [m]: Math.max(0, draft.fact[m] - 5) } })} className="grid size-14 place-items-center rounded-2xl border-2 border-line-2 hover:border-coral">
                        <Minus size={22} />
                      </button>
                      <span className="w-24 text-center font-mono text-3xl font-semibold tnum">{draft.fact[m]}</span>
                      <button type="button" aria-label={`${KID_METRIC[m]}: 5 минут қосу`} onClick={() => setDraft({ ...draft, fact: { ...draft.fact, [m]: Math.min(1440, draft.fact[m] + 5) } })} className="grid size-14 place-items-center rounded-2xl border-2 border-brand/30 bg-brand-50 text-brand hover:border-brand">
                        <Plus size={22} />
                      </button>
                      <span className="text-ink-3">мин</span>
                    </div>
                  </div>
                  {m !== 'unplanned' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-1 text-[15px] text-ink-2">
                      {plan === null ? (
                        <button type="button" onClick={() => setDraft({ ...draft, plan: { ...draft.plan, [m]: draft.fact[m] } })} className="font-semibold text-brand underline underline-offset-4">
                          + Жоспарды да жазу
                        </button>
                      ) : (
                        <>
                          <span>Жоспар:</span>
                          <button type="button" aria-label={`${KID_METRIC[m]}: жоспарды азайту`} onClick={() => setDraft({ ...draft, plan: { ...draft.plan, [m]: Math.max(0, (plan ?? 0) - 5) } })} className="grid size-9 place-items-center rounded-lg border border-line-2"><Minus size={15} /></button>
                          <span className="w-14 text-center font-mono font-semibold">{plan}</span>
                          <button type="button" aria-label={`${KID_METRIC[m]}: жоспарды көбейту`} onClick={() => setDraft({ ...draft, plan: { ...draft.plan, [m]: Math.min(1440, (plan ?? 0) + 5) } })} className="grid size-9 place-items-center rounded-lg border border-line-2"><Plus size={15} /></button>
                          <span>мин · айырма: <b className="font-mono">{draft.fact[m] - (plan ?? 0) > 0 ? '+' : ''}{draft.fact[m] - (plan ?? 0)}</b></span>
                          <button type="button" onClick={() => setDraft({ ...draft, plan: { ...draft.plan, [m]: null } })} className="ml-2 text-ink-3 underline">өшіру</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {total > 1440 && <ResultMessage tone="warn">Барлығы {total} минут — бұл 1440-тан көп. Сандарды тексер.</ResultMessage>}
            {!isNew && (
              <div className="flex flex-wrap items-center gap-3">
                {confirm ? (
                  <>
                    <span className="text-lg">Бұл күнді өшіреміз бе?</span>
                    <BigButton variant="secondary" className="border-danger text-danger" onClick={async () => { await deleteEntry(draft.id); setDraft(null); toast('Жазба өшірілді', 'info'); }}>Иә, өшіру</BigButton>
                    <BigButton variant="secondary" onClick={() => setConfirm(false)}>Жоқ</BigButton>
                  </>
                ) : (
                  <BigButton variant="secondary" icon={<Trash2 size={18} />} onClick={() => setConfirm(true)}>Күнді өшіру</BigButton>
                )}
              </div>
            )}
          </div>
        )}
      </KidShell>
    );
  }

  const cards = Math.max(target, realEntries.length);
  return (
    <KidShell section="/research" title="Менің зерттеуім" art={<ArtResearch size={72} />} instruction="Күн сайын бір карточканы толтыр: әр іске нақты қанша минут кетті?">
      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-xl">
        {(
          [
            ['sample', 'Үлгілік тәжірибе'],
            ['real', 'Менің нақты зерттеуім'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className={cx('min-h-14 rounded-2xl border-2 px-3 text-[17px] font-semibold', mode === v ? (v === 'sample' ? 'border-amber bg-amber-50 text-amber-700' : 'border-teal bg-teal-50 text-teal') : 'border-line-2 text-ink-2')}>
            {l}
          </button>
        ))}
      </div>

      {mode === 'sample' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SourceTag kind="demo" />
            <span className="text-[15px] text-ink-3">Ғылыми жұмыстағы 5 күндік мысал. Бұл — нақты бақылау емес. Оны өзгертуге болмайды.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SAMPLE_DIARY.map((e) => (
              <DayCard key={e.id} title={sampleDayLabel(e.id)} entry={e} />
            ))}
          </div>
          <BigButton variant="teal" className="mt-6" onClick={() => setMode('real')}>
            Өз зерттеуімді бастау
          </BigButton>
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SourceTag kind="real" />
            <span className="text-[17px] font-semibold">Неше күн бақылаймын?</span>
            {([5, 7, 10, 14] as const).map((d) => (
              <button key={d} type="button" aria-pressed={target === d} onClick={() => setProtocol({ targetDays: d })} className={cx('h-12 min-w-16 rounded-2xl border-2 px-3 text-lg font-semibold', target === d ? 'border-brand bg-brand-50 text-brand' : 'border-line-2')}>
                {d}
              </button>
            ))}
          </div>
          {target >= 10 && <p className="mb-4 text-[16px] text-ink-2">Хаттама: алғашқы {Math.floor(target / 2)} күн жоспарды өзің құрасың, қалған күндері — көмекшімен.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: cards }, (_, k) => {
              const e = realEntries[k];
              return e ? (
                <button key={e.id} type="button" onClick={() => { setDraft(e); setStep(2); setConfirm(false); }} className="text-left">
                  <DayCard title={`${k + 1}-күн`} entry={e} editable />
                </button>
              ) : (
                <button key={`empty-${k}`} type="button" onClick={() => openNew(k)} disabled={k > realEntries.length} className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line-2 bg-soft/50 p-4 text-ink-3 hover:border-brand hover:text-brand disabled:opacity-40">
                  <span className="font-display text-xl font-semibold">{k + 1}-күн</span>
                  <Plus size={30} />
                  <span className="text-[15px] font-semibold">Жазу</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[15px] text-ink-3">Деректер тек осы құрылғыда сақталады.</p>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-line">
        <button type="button" onClick={() => setAdult((x) => !x)} aria-expanded={adult} className="flex w-full items-center justify-between px-4 py-3 text-[15px] font-semibold text-ink-2">
          Ересектерге: деректерді сақтау және жүктеу (JSON)
          <ChevronDown size={18} className={cx('transition-transform', adult && 'rotate-180')} />
        </button>
        {adult && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line p-4 text-[15px]">
            <button type="button" disabled={!realEntries.length} onClick={() => downloadText(`aqyldy-kun-kundelik-${todayISO()}.json`, JSON.stringify(makeExport(realEntries), null, 2), 'application/json')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-2 px-3 font-medium hover:border-brand disabled:opacity-40">
              <Download size={16} /> JSON экспорт
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-2 px-3 font-medium hover:border-brand">
              <Upload size={16} /> JSON импорт (біріктіру)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = '';
                if (!f) return;
                const r = parseImport(await f.text());
                if (!r.ok) return setImportMsg(r.error ?? 'Қате');
                const byDate = new Map(realEntries.map((e) => [e.date, e]));
                for (const e of r.entries) byDate.set(e.date, e);
                await replaceEntries([...byDate.values()]);
                setImportMsg(`${r.entries.length} жазба жүктелді.`);
              }}
            />
            <Link to="/teacher/diary" className="font-semibold text-brand underline underline-offset-4">
              Кесте түрінде ашу
            </Link>
            {importMsg && <span className="w-full text-ink-2">{importMsg}</span>}
          </div>
        )}
      </div>
    </KidShell>
  );
}

function DayCard({ title, entry, editable }: { title: string; entry: DiaryEntry; editable?: boolean }) {
  return (
    <div className="h-full rounded-3xl border-2 border-line bg-white p-4 transition-colors hover:border-brand/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-xl font-semibold">{title}</div>
          {!entry.id.startsWith('sample-') && <div className="font-mono text-sm text-ink-3">{fmtDate(entry.date)}</div>}
        </div>
        {editable && <Pencil size={18} className="text-ink-3" />}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[12px]">
        <span className="rounded-md bg-soft-2 px-1.5 py-0.5">{entry.dayType === 'school' ? 'оқу күні' : 'демалыс'}</span>
        {entry.phase !== 'none' && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand">{entry.phase === 'self' ? 'өзім' : 'көмекшімен'}</span>}
      </div>
      <ul className="mt-3 space-y-1.5">
        {METRICS.map((m) => {
          const A = ART[m];
          return (
            <li key={m} className="flex items-center gap-2 text-[15px]">
              <A size={24} />
              <span className="flex-1 truncate">{METRIC_LABELS[m]}</span>
              <span className="font-mono font-semibold tnum">{entry.fact[m]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
