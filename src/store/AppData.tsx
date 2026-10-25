import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { DiaryEntrySchema, sortByDate, type DiaryEntry } from '../core/diary';
import { DEFAULT_AUTHOR, SAMPLE_DIARY } from '../data/research';
import { clearStore, getAll, isPersistent, kvGet, kvSet, put, remove } from './db';

export type DataMode = 'sample' | 'real';
export interface Author {
  student: string;
  grade: string;
  supervisor: string;
}
export interface ProtocolSettings {
  targetDays: 5 | 7 | 10 | 14;
}

interface Toast {
  id: number;
  tone: 'ok' | 'info' | 'error';
  text: string;
}

interface Ctx {
  ready: boolean;
  persistent: boolean;
  mode: DataMode;
  setMode: (m: DataMode) => void;
  realEntries: DiaryEntry[];
  /** Таңдалған режимге сай жазбалар */
  entries: DiaryEntry[];
  saveEntry: (e: DiaryEntry) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<void>;
  replaceEntries: (list: DiaryEntry[]) => Promise<void>;
  author: Author;
  setAuthor: (a: Author) => void;
  protocol: ProtocolSettings;
  setProtocol: (p: ProtocolSettings) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<DataMode>('sample');
  const [realEntries, setReal] = useState<DiaryEntry[]>([]);
  const [author, setAuthorState] = useState<Author>(DEFAULT_AUTHOR);
  const [protocol, setProtocolState] = useState<ProtocolSettings>({ targetDays: 10 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    (async () => {
      const [list, m, a, p] = await Promise.all([getAll<DiaryEntry>('diary'), kvGet<DataMode>('mode'), kvGet<Author>('author'), kvGet<ProtocolSettings>('protocol')]);
      const valid = list.filter((e) => DiaryEntrySchema.safeParse(e).success);
      setReal(sortByDate(valid));
      if (m) setModeState(m);
      else if (valid.length) setModeState('real');
      if (a) setAuthorState(a);
      if (p) setProtocolState(p);
      setReady(true);
    })();
  }, []);

  const setMode = useCallback((m: DataMode) => {
    setModeState(m);
    void kvSet('mode', m);
  }, []);
  const setAuthor = useCallback((a: Author) => {
    setAuthorState(a);
    void kvSet('author', a);
  }, []);
  const setProtocol = useCallback((p: ProtocolSettings) => {
    setProtocolState(p);
    void kvSet('protocol', p);
  }, []);

  const saveEntry = useCallback(
    async (e: DiaryEntry) => {
      const r = DiaryEntrySchema.safeParse(e);
      if (!r.success) {
        toast(r.error.issues[0]?.message ?? 'Жазба қате', 'error');
        return false;
      }
      if (realEntries.some((x) => x.date === e.date && x.id !== e.id)) {
        toast('Бұл күнге жазба бұрыннан бар. Бір күнге бір жазба.', 'error');
        return false;
      }
      await put('diary', r.data);
      setReal((list) => sortByDate([...list.filter((x) => x.id !== e.id), r.data]));
      return true;
    },
    [realEntries, toast],
  );

  const deleteEntry = useCallback(async (id: string) => {
    await remove('diary', id);
    setReal((list) => list.filter((x) => x.id !== id));
  }, []);

  const replaceEntries = useCallback(async (list: DiaryEntry[]) => {
    await clearStore('diary');
    for (const e of list) await put('diary', e);
    setReal(sortByDate(list));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      persistent: isPersistent(),
      mode,
      setMode,
      realEntries,
      entries: mode === 'sample' ? SAMPLE_DIARY : realEntries,
      saveEntry,
      deleteEntry,
      replaceEntries,
      author,
      setAuthor,
      protocol,
      setProtocol,
      toast,
    }),
    [ready, mode, setMode, realEntries, saveEntry, deleteEntry, replaceEntries, author, setAuthor, protocol, setProtocol, toast],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-lg"
            >
              {t.tone === 'ok' ? <CheckCircle2 size={18} className="text-ok" /> : t.tone === 'error' ? <XCircle size={18} className="text-danger" /> : <Info size={18} className="text-brand" />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}

export function useAppData() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppDataProvider жоқ');
  return c;
}

/** Атаулы сценарийлерді сақтау/жүктеу (1- және 2-зертханалар). */
export function useSavedList<T>(store: 'scenarios' | 'plans') {
  const [items, setItems] = useState<Array<{ id: string; name: string; createdAt: string; data: T }>>([]);
  const reload = useCallback(async () => {
    const all = await getAll<{ id: string; name: string; createdAt: string; data: T }>(store);
    setItems(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, [store]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const save = useCallback(
    async (name: string, data: T) => {
      const rec = { id: `${store}-${Date.now().toString(36)}`, name, createdAt: new Date().toISOString(), data };
      await put(store, rec);
      await reload();
      return rec;
    },
    [store, reload],
  );
  const del = useCallback(
    async (id: string) => {
      await remove(store, id);
      await reload();
    },
    [store, reload],
  );
  return { items, save, del, reload };
}
