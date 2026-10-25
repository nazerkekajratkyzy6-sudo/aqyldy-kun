import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/explain';

function mockRes() {
  const r: { code?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  return {
    r,
    res: {
      setHeader: (k: string, v: string) => (r.headers[k] = v),
      status: (n: number) => ({ json: (b: unknown) => { r.code = n; r.body = b; } }),
    },
  };
}
const valid = { window: { start: '16:00', end: '19:00', minutes: 180 }, items: [{ kind: 'study', label: 'x', start: '16:00', end: '17:00', minutes: 60, fixed: false }] };

describe('міндетті емес LLM API (оқшауланған)', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.restoreAllMocks();
  });
  it('кілт жоқ болса — модель шақырылмайды, available: false', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    const { r, res } = mockRes();
    await handler({ method: 'POST', body: valid }, res);
    expect(r.code).toBe(200);
    expect((r.body as { available: boolean }).available).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it('тек POST', async () => {
    const { r, res } = mockRes();
    await handler({ method: 'GET' }, res);
    expect(r.code).toBe(405);
  });
  it('қате пішімді дерек қабылданбайды; клиент мәтіні (label) модельге жіберілмейді', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), { status: 200 }));
    const bad = mockRes();
    await handler({ method: 'POST', body: { ...valid, items: [{ ...valid.items[0], kind: 'hack' }] } }, bad.res);
    expect(bad.r.code).toBe(400);
    const good = mockRes();
    await handler({ method: 'POST', body: { ...valid, items: [{ ...valid.items[0], label: 'Айгерім, мекенжай' }] } }, good.res);
    expect(good.r.code).toBe(200);
    const sent = String((f.mock.calls[0][1] as RequestInit).body);
    expect(sent).not.toContain('Айгерім');
    expect(sent).toContain('оқу/үй тапсырмасы');
  });
});
