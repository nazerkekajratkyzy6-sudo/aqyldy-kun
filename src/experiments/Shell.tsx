import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Save, Trash2, History } from 'lucide-react';
import { Button, Card, DataBadge } from '../components/ui';
import { getAll, put, remove, type ExperimentRecord } from '../store/db';
import { useAppData } from '../store/AppData';

export interface ShellProps {
  n: number;
  title: string;
  goal: ReactNode;
  demo: boolean;
  source?: ReactNode;
  initial: ReactNode;
  params: ReactNode;
  calc: ReactNode;
  chart: ReactNode;
  comparison: ReactNode;
  conclusion: string;
  snapshot: () => { params: Record<string, unknown>; results: Record<string, unknown> };
  onReset: () => void;
  onLoad?: (params: Record<string, unknown>) => void;
}

function Section({ k, title, children }: { k: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 first:border-t-0">
      <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold">
        <span className="grid size-6 place-items-center rounded-md bg-soft-2 font-mono text-xs text-ink-2">{k}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Эксперименттің бірыңғай құрылымы: мақсат → деректер → параметрлер → есеп → график → салыстыру → қорытынды → сақтау. */
export function ExperimentShell(p: ShellProps) {
  const { toast } = useAppData();
  const [saved, setSaved] = useState<ExperimentRecord[]>([]);
  const reload = useCallback(async () => {
    const all = await getAll<ExperimentRecord>('experiments');
    setSaved(all.filter((r) => r.experiment === p.n).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, [p.n]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async () => {
    const snap = p.snapshot();
    await put('experiments', {
      id: `exp${p.n}-${Date.now().toString(36)}`,
      experiment: p.n,
      title: p.title,
      createdAt: new Date().toISOString(),
      demo: p.demo,
      params: snap.params,
      results: snap.results,
      conclusion: p.conclusion,
    });
    await reload();
    toast('Эксперимент нәтижесі сақталды');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">{p.n}-эксперимент</div>
          <h2 className="font-display text-xl font-semibold">{p.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataBadge kind={p.demo ? 'demo' : 'edited'} />
          <Button size="sm" variant="ghost" onClick={p.onReset}>
            Бастапқы деректер
          </Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="lg:border-r lg:border-line">
          <Section k="1" title="Мақсат">
            <p className="text-[15px] leading-relaxed text-ink-2">{p.goal}</p>
          </Section>
          <Section k="2" title="Бастапқы деректер">
            {p.initial}
            {p.source && <p className="mt-2 text-xs text-ink-3">Дереккөз: {p.source}</p>}
          </Section>
          <Section k="3" title="Өзгертілетін параметрлер">
            {p.params}
          </Section>
          <Section k="4" title="Есептеу">
            {p.calc}
          </Section>
        </div>
        <div>
          <Section k="5" title="График">
            {p.chart}
          </Section>
          <Section k="6" title="Салыстыру">
            {p.comparison}
          </Section>
          <Section k="7" title="Қорытынды">
            <p className="rounded-xl border border-teal/30 bg-teal-50 px-4 py-3 text-[15px] leading-relaxed">{p.conclusion}</p>
            <p className="mt-2 text-xs text-ink-3">{p.demo ? 'Қорытынды үлгі деректерге негізделген — нақты бақылау нәтижесі емес.' : 'Қорытынды модельдеу сценарийіне негізделген.'} Бір оқушының деректері ЖИ-дің әмбебап тиімділігін дәлелдемейді.</p>
          </Section>
          <Section k="8" title="Сақтау">
            <Button variant="primary" onClick={save}>
              <Save size={16} /> Нәтижені сақтау
            </Button>
            {saved.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {saved.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-ink-3">
                        <History size={13} /> {new Date(r.createdAt).toLocaleString('kk-KZ')} · {r.demo ? 'үлгі' : 'сценарий'}
                      </div>
                      <div className="line-clamp-2 text-ink-2">{r.conclusion}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {p.onLoad && (
                        <Button size="sm" variant="ghost" onClick={() => p.onLoad!(r.params)}>
                          Ашу
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" aria-label="Жою" onClick={async () => { await remove('experiments', r.id); await reload(); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </Card>
  );
}

/** Параметр жолы: атауы + сандық өріс. */
export function ParamRow({ label, children, color }: { label: ReactNode; children: ReactNode; color?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-2 text-sm font-medium text-ink-2">
        {color && <span className="size-3 rounded-[3px]" style={{ background: color }} aria-hidden />}
        {label}
      </span>
      {children}
    </div>
  );
}
