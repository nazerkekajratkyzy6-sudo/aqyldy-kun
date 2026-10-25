/**
 * МІНДЕТТІ ЕМЕС серверлік функция (Vercel Serverless Function).
 * Алгоритмдік жоспарды қарапайым қазақ тілінде түсіндіру үшін тілдік модельді шақырады.
 * Кілт: ANTHROPIC_API_KEY (тек Vercel Environment Variables). Кілт жоқ болса — 501.
 * Кіріс қатаң тексеріледі: тек әрекет түрі, уақыт және минуттар қабылданады.
 */

const KINDS = new Set(['study', 'reading', 'movement', 'rest', 'screen', 'other', 'break', 'reserve']);
const HM = /^\d{2}:\d{2}$/;

interface Item {
  kind: string;
  label: string;
  start: string;
  end: string;
  minutes: number;
  fixed: boolean;
}

function validate(body: unknown): { window: { start: string; end: string; minutes: number }; items: Item[] } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const w = b.window as Record<string, unknown> | undefined;
  if (!w || typeof w.start !== 'string' || typeof w.end !== 'string' || !HM.test(w.start) || !HM.test(w.end) || typeof w.minutes !== 'number') return null;
  if (!Array.isArray(b.items) || b.items.length > 40) return null;
  const items: Item[] = [];
  for (const raw of b.items) {
    const i = raw as Record<string, unknown>;
    if (typeof i.kind !== 'string' || !KINDS.has(i.kind)) return null;
    if (typeof i.start !== 'string' || typeof i.end !== 'string' || !HM.test(i.start) || !HM.test(i.end)) return null;
    if (typeof i.minutes !== 'number' || i.minutes < 0 || i.minutes > 1440) return null;
    // label мәтінін клиенттен алмаймыз — тек сервердегі тізімнен (жеке дерек енбеуі үшін)
    items.push({ kind: i.kind, label: i.kind, start: i.start, end: i.end, minutes: Math.round(i.minutes), fixed: i.fixed === true });
  }
  return { window: { start: w.start, end: w.end, minutes: Math.round(w.minutes) }, items };
}

const LABELS: Record<string, string> = {
  study: 'оқу/үй тапсырмасы',
  reading: 'кітап оқу',
  movement: 'қозғалыс',
  rest: 'демалыс',
  screen: 'экран',
  other: 'басқа',
  break: 'үзіліс',
  reserve: 'резерв',
};

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void }; setHeader: (k: string, v: string) => void }) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Тек POST.' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(200).json({ available: false, error: 'Серверлік тілдік модель қосылмаған (ANTHROPIC_API_KEY орнатылмаған). Жергілікті алгоритм толық жұмыс істейді.' });
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'JSON қате.' });
    }
  }
  const data = validate(body);
  if (!data) return res.status(400).json({ error: 'Кіріс деректер пішімі сәйкес емес.' });

  const lines = data.items.map((i) => `${i.start}–${i.end}: ${LABELS[i.kind]} (${i.minutes} мин${i.fixed ? ', бекітілген' : ''})`).join('\n');
  const prompt = `Сен бастауыш сынып оқушысына күн жоспарын түсіндіретін көмекшісің. Төменде алгоритм құрған жоспар берілген (${data.window.start}–${data.window.end}, барлығы ${data.window.minutes} минут):\n${lines}\n\nТапсырма: 2-сынып оқушысына түсінікті қарапайым қазақ тілінде 4–6 қысқа сөйлеммен жоспардың ретін түсіндір. Барлық минуттардың қосындысын көрсетіп, ол ${data.window.minutes} минутқа тең екенін тексер. Жеке деректер сұрама. Жаңа әрекет қоспа, уақыттарды өзгертпе.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.LLM_MODEL || 'claude-haiku-5-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return res.status(502).json({ error: `Тілдік модель қатесі (${r.status}).` });
    const j = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n').trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: 'Тілдік модельге қосылу мүмкін болмады.' });
  }
}
