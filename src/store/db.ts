import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DiaryEntry } from '../core/diary';

/**
 * Жергілікті сақтау: IndexedDB (браузердің ішінде, серверге жіберілмейді).
 * IndexedDB қолжетімсіз болса (мысалы, жеке терезе шектеуі), уақытша жадқа сақталады.
 */
export interface SavedRecord<T = unknown> {
  id: string;
  name: string;
  createdAt: string;
  data: T;
}

export interface ExperimentRecord {
  id: string;
  experiment: number;
  title: string;
  createdAt: string;
  demo: boolean;
  params: Record<string, unknown>;
  results: Record<string, unknown>;
  conclusion: string;
}

interface AqDB extends DBSchema {
  diary: { key: string; value: DiaryEntry };
  scenarios: { key: string; value: SavedRecord };
  plans: { key: string; value: SavedRecord };
  experiments: { key: string; value: ExperimentRecord };
  kv: { key: string; value: unknown };
}

type StoreName = 'diary' | 'scenarios' | 'plans' | 'experiments' | 'kv';

let dbPromise: Promise<IDBPDatabase<AqDB> | null> | null = null;
const memory: Record<StoreName, Map<string, unknown>> = {
  diary: new Map(),
  scenarios: new Map(),
  plans: new Map(),
  experiments: new Map(),
  kv: new Map(),
};
let persistent = true;

function getDB() {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('no idb');
        return await openDB<AqDB>('aqyldy-kun', 1, {
          upgrade(db) {
            db.createObjectStore('diary', { keyPath: 'id' });
            db.createObjectStore('scenarios', { keyPath: 'id' });
            db.createObjectStore('plans', { keyPath: 'id' });
            db.createObjectStore('experiments', { keyPath: 'id' });
            db.createObjectStore('kv');
          },
        });
      } catch {
        persistent = false;
        return null;
      }
    })();
  }
  return dbPromise;
}

export function isPersistent() {
  return persistent;
}

export async function getAll<T>(store: Exclude<StoreName, 'kv'>): Promise<T[]> {
  const db = await getDB();
  if (!db) return [...memory[store].values()] as T[];
  return (await db.getAll(store)) as T[];
}

export async function put<T extends { id: string }>(store: Exclude<StoreName, 'kv'>, value: T): Promise<void> {
  const db = await getDB();
  if (!db) {
    memory[store].set(value.id, value);
    return;
  }
  await db.put(store, value as never);
}

export async function remove(store: Exclude<StoreName, 'kv'>, id: string): Promise<void> {
  const db = await getDB();
  if (!db) {
    memory[store].delete(id);
    return;
  }
  await db.delete(store, id);
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDB();
  if (!db) {
    memory[store].clear();
    return;
  }
  await db.clear(store);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  if (!db) return memory.kv.get(key) as T | undefined;
  return (await db.get('kv', key)) as T | undefined;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  if (!db) {
    memory.kv.set(key, value);
    return;
  }
  await db.put('kv', value as unknown, key);
}

/** Барлық деректі бір файлға (толық сақтық көшірме). */
export async function exportAll() {
  const [diary, scenarios, plans, experiments] = await Promise.all([getAll('diary'), getAll('scenarios'), getAll('plans'), getAll('experiments')]);
  return { diary, scenarios, plans, experiments };
}
