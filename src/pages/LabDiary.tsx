import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Download, FileJson, NotebookPen, Pencil, Plus, ShieldAlert, Trash2, Upload, X, ClipboardList, BarChart3 } from 'lucide-react';
import { Page } from '../components/Layout';
import { DataTable } from '../components/charts';
import { Badge, Button, Callout, Card, CardHeader, DataBadge, Field, MinutesInput, SectionTitle, Segmented, inputCls, cx } from '../components/ui';
import { METRICS, METRIC_LABELS, PLAN_METRICS, emptyEntry, makeExport, parseImport, type DiaryEntry } from '../core/diary';
import { fmtDate, todayISO, uid } from '../core/format';
import { METRIC_COLORS } from '../lib/palette';
import { SAMPLE_DIARY, sampleDayLabel } from '../data/research';
import { useAppData } from '../store/AppData';
import { downloadText } from '../lib/download';

const PHASE_LABEL = { self: 'Өз бетімен', assistant: 'Көмекшімен', none: '—' } as const;
const DAYTYPE_LABEL = { school: 'Оқу күні', weekend: 'Демалыс күні' } as const;

export default function LabDiary() {
  const { mode, setMode, realEntries, saveEntry, deleteEntry, replaceEntries, protocol, setProtocol, toast, persistent } = useAppData();
  const [draft, setDraft] = useState<DiaryEntry | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<DiaryEntry[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const target = protocol.targetDays;
  const suggestPhase = (n: number): DiaryEntry['phase'] => (target === 10 ? (n < 5 ? 'self' : 'assistant') : target === 14 ? (n < 7 ? 'self' : 'assistant') : 'none');

  const newDraft = () => {
    const used = new Set(realEntries.map((e) => e.date));
    let d = new Date();
    while (used.has(todayISO(d))) d = new Date(d.getTime() - 86400000);
    setDraft({ ...emptyEntry(uid('day'), todayISO(d)), phase: suggestPhase(realEntries.length) });
  };

  const factSum = draft ? METRICS.reduce((s, m) => s + draft.fact[m], 0) : 0;
  const counts = useMemo(() => ({ self: realEntries.filter((e) => e.phase === 'self').length, assistant: realEntries.filter((e) => e.phase === 'assistant').length, school: realEntries.filter((e) => e.dayType === 'school').length, weekend: realEntries.filter((e) => e.dayType === 'weekend').length }), [realEntries]);

  return (
    <Page>
      <SectionTitle eyebrow="6-зертхана" title="Зерттеу күнделігі" lead="Нақты бақылау күнделігі: әр күн үшін жоспар мен факт, экран, кітап, қозғалыс және жоспардан тыс уақыт. Деректер тек осы құрылғыдағы IndexedDB-де сақталады; JSON арқылы көшірме жасауға болады." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Дерек режимі"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sample', label: 'Үлгілік тәжірибе' },
            { value: 'real', label: 'Нақты зерттеу' },
          ]}
        />
        <DataBadge kind={mode === 'sample' ? 'demo' : 'real'} />
        {!persistent && <Badge tone="warn">IndexedDB қолжетімсіз: деректер бет жабылғанда жоғалады — JSON-ға сақтаңыз</Badge>}
      </div>

      {mode === 'sample' ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Үлгі 5 күндік деректер" subtitle="Зерттеу жұмысы, 2.4-кесте. Жоспар бағаны берілмеген." icon={<ClipboardList size={18} />} actions={<DataBadge kind="demo" />} />
            <div className="overflow-x-auto p-3">
              <DataTable head={['Күн', ...METRICS.map((m) => METRIC_LABELS[m])]} rows={SAMPLE_DIARY.map((e) => [sampleDayLabel(e.id), ...METRICS.map((m) => e.fact[m])])} />
            </div>
            <p className="px-5 pb-4 text-sm text-ink-3">Бұл сандар жобаның құрылымын көрсету үшін берілген демонстрациялық деректер. Конкурсқа тапсырар алдында оларды оқушының нақты бақылау нәтижелерімен алмастыру қажет.</p>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold">Нақты зерттеуді бастау</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Нақты режимде әр күннің жазбасын өзің енгізесің. Талдау, графиктер және PDF есеп тек сенің деректеріңмен жасалады; үлгі деректер оларға араласпайды.</p>
            <Button variant="teal" className="mt-4" onClick={() => setMode('real')}>
              <NotebookPen size={17} /> Нақты зерттеу режиміне өту
            </Button>
            {realEntries.length > 0 && <p className="mt-3 text-sm text-ink-3">Сақталған нақты жазбалар: {realEntries.length}</p>}
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <Card className="p-5">
              <h3 className="font-display text-lg font-semibold">Бақылау ұзақтығы</h3>
              <div className="mt-3">
                <Segmented
                  label="Күн саны"
                  value={String(target) as '5' | '7' | '10' | '14'}
                  onChange={(v) => setProtocol({ targetDays: Number(v) as 5 | 7 | 10 | 14 })}
                  options={[
                    { value: '5', label: '5 күн' },
                    { value: '7', label: '7 күн' },
                    { value: '10', label: '10 күн' },
                    { value: '14', label: '14 күн' },
                  ]}
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between text-sm">
                <span className="text-ink-2">Жазылған күндер</span>
                <span className="font-mono font-semibold tnum">
                  {realEntries.length} / {target}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-soft-2" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={realEntries.length} aria-label="Бақылау прогресі">
                <motion.div className="h-full rounded-full bg-teal" animate={{ width: `${Math.min(100, (realEntries.length / target) * 100)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Badge>Өз бетімен: {counts.self}</Badge>
                <Badge tone="brand">Көмекшімен: {counts.assistant}</Badge>
                <Badge tone="teal">Оқу күні: {counts.school}</Badge>
                <Badge tone="warn">Демалыс күні: {counts.weekend}</Badge>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-display text-lg font-semibold">10 күндік эксперименттік хаттама</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>1–5 күн: оқушы күнін өз бетімен жоспарлайды (кезең: «Өз бетімен»).</li>
                <li>6–10 күн: жоспарды көмекшімен құрады (4-зертхана, кезең: «Көмекшімен»).</li>
                <li>Күн сайын бірдей көрсеткіштер жазылады: жоспар мен факт, экран, кітап, қозғалыс, жоспардан тыс уақыт.</li>
                <li>Оқу және демалыс күндері белгіленеді; талдауда олар араласса, ескерту шығады.</li>
                <li>Қорытынды сақ жасалады: бір баланың бақылауы ЖИ-дің әмбебап тиімділігін дәлелдемейді.</li>
              </ol>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Нақты жазбалар"
              subtitle={realEntries.length ? `${realEntries.length} күн` : 'Әзірге жазба жоқ'}
              icon={<NotebookPen size={18} />}
              actions={
                <>
                  <Button size="sm" variant="primary" onClick={newDraft}>
                    <Plus size={15} /> Күн қосу
                  </Button>
                  <Button size="sm" onClick={() => downloadText(`aqyldy-kun-kundelik-${todayISO()}.json`, JSON.stringify(makeExport(realEntries), null, 2), 'application/json')} disabled={!realEntries.length}>
                    <Download size={15} /> JSON экспорт
                  </Button>
                  <Button size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload size={15} /> JSON импорт
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      const r = parseImport(await f.text());
                      if (!r.ok) {
                        setImportError(r.error ?? 'Қате');
                        setPendingImport(null);
                      } else {
                        setImportError(null);
                        setPendingImport(r.entries);
                      }
                    }}
                  />
                </>
              }
            />
            {importError && (
              <Callout tone="danger" className="m-5 mb-0" title="Импорт сәтсіз">
                {importError}
              </Callout>
            )}
            {pendingImport && (
              <div className="m-5 mb-0 flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand-50 px-4 py-3 text-sm">
                <FileJson size={18} className="text-brand" />
                <span>Файлда {pendingImport.length} жазба бар. Қалай қосамыз?</span>
                <Button size="sm" variant="primary" onClick={async () => { const byDate = new Map(realEntries.map((e) => [e.date, e])); for (const e of pendingImport) byDate.set(e.date, e); await replaceEntries([...byDate.values()]); setPendingImport(null); toast('Жазбалар біріктірілді'); }}>
                  Біріктіру (бір күн — жаңасы)
                </Button>
                <Button size="sm" variant="danger" onClick={async () => { await replaceEntries(pendingImport); setPendingImport(null); toast('Жазбалар ауыстырылды'); }}>
                  Толық ауыстыру
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingImport(null)}>
                  Болдырмау
                </Button>
              </div>
            )}

            {draft && (
              <EntryForm
                draft={draft}
                setDraft={setDraft}
                factSum={factSum}
                onCancel={() => setDraft(null)}
                onSave={async () => {
                  if (await saveEntry(draft)) {
                    toast('Жазба сақталды');
                    setDraft(null);
                  }
                }}
              />
            )}

            {realEntries.length === 0 && !draft ? (
              <div className="p-10 text-center">
                <p className="text-ink-2">Нақты бақылау жазбасы әлі жоқ. «Күн қосу» батырмасын бас.</p>
                <p className="mt-1 text-sm text-ink-3">Деректер енгізілмейінше, талдау бөлімінде ешқандай «жақсару» туралы тұжырым жасалмайды.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-soft text-xs text-ink-3">
                    <tr>
                      <th className="px-3 py-2 text-left">Күні</th>
                      <th className="px-2 py-2 text-left">Түрі / кезең</th>
                      {METRICS.map((m) => (
                        <th key={m} className="px-2 py-2 text-right">
                          {METRIC_LABELS[m]}
                          {m !== 'unplanned' && <div className="font-normal">жоспар / факт</div>}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left">Түсініктеме</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {realEntries.map((e) => (
                      <tr key={e.id} className="border-t border-line">
                        <td className="px-3 py-2 font-mono tnum">{fmtDate(e.date)}</td>
                        <td className="px-2 py-2">
                          <div>{DAYTYPE_LABEL[e.dayType]}</div>
                          <div className="text-xs text-ink-3">{PHASE_LABEL[e.phase]}</div>
                        </td>
                        {METRICS.map((m) => (
                          <td key={m} className="px-2 py-2 text-right font-mono tnum">
                            {m !== 'unplanned' && <span className="text-ink-3">{e.plan[m as (typeof PLAN_METRICS)[number]] ?? '—'} / </span>}
                            {e.fact[m]}
                          </td>
                        ))}
                        <td className="max-w-48 truncate px-2 py-2 text-ink-2" title={e.comment}>
                          {e.comment || '—'}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" aria-label={`${fmtDate(e.date)} өзгерту`} onClick={() => setDraft(e)}>
                              <Pencil size={14} />
                            </Button>
                            {confirmDel === e.id ? (
                              <>
                                <Button size="sm" variant="danger" onClick={async () => { await deleteEntry(e.id); setConfirmDel(null); toast('Жазба жойылды', 'info'); }}>
                                  Жою
                                </Button>
                                <Button size="sm" variant="ghost" aria-label="Болдырмау" onClick={() => setConfirmDel(null)}>
                                  <X size={14} />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" aria-label={`${fmtDate(e.date)} жою`} onClick={() => setConfirmDel(e.id)}>
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
              <Link to="/teacher/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                <BarChart3 size={16} /> Талдауға өту
              </Link>
              {realEntries.length > 0 &&
                (confirmClear ? (
                  <span className="flex items-center gap-2 text-sm">
                    Барлық нақты жазбаны өшіреміз бе?
                    <Button size="sm" variant="danger" onClick={async () => { await replaceEntries([]); setConfirmClear(false); toast('Барлық жазба өшірілді', 'info'); }}>
                      Иә, өшіру
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                      Жоқ
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                    <Trash2 size={14} /> Барлығын өшіру
                  </Button>
                ))}
            </div>
          </Card>
          <Callout tone="info" className="mt-4">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldAlert size={15} /> Зерттеу этикасы:
            </span>{' '}
            түсініктемеге мекенжай, телефон, құпия сөз сияқты жеке деректерді жазба. Деректер серверге жіберілмейді.
          </Callout>
        </>
      )}
    </Page>
  );
}

function EntryForm({ draft, setDraft, factSum, onCancel, onSave }: { draft: DiaryEntry; setDraft: (d: DiaryEntry) => void; factSum: number; onCancel: () => void; onSave: () => void }) {
  const over = factSum > 1440;
  return (
    <form
      className="m-5 rounded-2xl border border-brand/30 bg-brand-50/40 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Күні" htmlFor="d-date">
          <input id="d-date" type="date" required className={inputCls} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </Field>
        <Field label="Күн түрі" htmlFor="d-type">
          <select id="d-type" className={inputCls} value={draft.dayType} onChange={(e) => setDraft({ ...draft, dayType: e.target.value as DiaryEntry['dayType'] })}>
            <option value="school">Оқу күні</option>
            <option value="weekend">Демалыс күні</option>
          </select>
        </Field>
        <Field label="Хаттама кезеңі" htmlFor="d-phase">
          <select id="d-phase" className={inputCls} value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value as DiaryEntry['phase'] })}>
            <option value="self">Өз бетімен жоспарлау</option>
            <option value="assistant">Көмекшімен жоспарлау</option>
            <option value="none">Белгісіз / жоқ</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 grid gap-x-6 gap-y-3 md:grid-cols-2">
        {METRICS.map((m) => (
          <div key={m} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="size-3 rounded-[3px]" style={{ background: METRIC_COLORS[m] }} aria-hidden />
              {METRIC_LABELS[m]}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {m !== 'unplanned' && (
                <label className="flex items-center gap-1 text-xs text-ink-3">
                  жоспар
                  <input
                    inputMode="numeric"
                    aria-label={`${METRIC_LABELS[m]}: жоспар (міндетті емес)`}
                    placeholder="—"
                    className="h-9 w-16 rounded-lg border border-line-2 bg-white px-2 text-right font-mono text-sm tnum"
                    value={draft.plan[m as (typeof PLAN_METRICS)[number]] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      const n = Math.max(0, Math.min(1440, Math.round(Number(v))));
                      setDraft({ ...draft, plan: { ...draft.plan, [m]: v === '' || !Number.isFinite(Number(v)) ? null : n } });
                    }}
                  />
                </label>
              )}
              <span className="text-xs text-ink-3">факт</span>
              <MinutesInput compact label={`${METRIC_LABELS[m]}: факт`} value={draft.fact[m]} onChange={(v) => setDraft({ ...draft, fact: { ...draft.fact, [m]: Math.max(0, Math.min(1440, v)) } })} />
            </div>
          </div>
        ))}
      </div>
      <Field label="Түсініктеме (жеке дерек жазбаңыз)" htmlFor="d-comment">
        <textarea id="d-comment" maxLength={1000} rows={2} className={cx(inputCls, 'mt-0 h-auto py-2')} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
      </Field>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={over}>
          Сақтау
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Болдырмау
        </Button>
        <span className={cx('font-mono text-sm', over ? 'text-danger' : 'text-ink-3')}>
          Σ факт = {factSum} мин {over && '> 1440 — мүмкін емес'}
        </span>
      </div>
    </form>
  );
}
