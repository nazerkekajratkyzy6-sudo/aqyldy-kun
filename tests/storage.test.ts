import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getAll, kvGet, kvSet, put, remove } from '../src/store/db';
import { emptyEntry } from '../src/core/diary';

describe('IndexedDB сақтау/қалпына келтіру', () => {
  it('күнделік жазбасын сақтау, оқу, жою', async () => {
    const e = { ...emptyEntry('d1', '2026-10-05'), fact: { homework: 40, screen: 30, reading: 20, movement: 30, unplanned: 5 } };
    await put('diary', e);
    expect(await getAll('diary')).toEqual([e]);
    await remove('diary', 'd1');
    expect(await getAll('diary')).toEqual([]);
  });
  it('kv баптаулары', async () => {
    await kvSet('mode', 'real');
    expect(await kvGet('mode')).toBe('real');
  });
});
