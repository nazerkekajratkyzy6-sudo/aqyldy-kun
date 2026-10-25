import { jsPDF } from 'jspdf';
import { METRICS, METRIC_LABELS } from '../core/diary';
import { fmtNumber, fmtPercent, fmtSigned } from '../core/format';
import { PROJECT } from '../data/research';
import { METHOD_LABELS, dayLabel, type AnalyticsResult } from './analytics';
import { METRIC_COLORS } from './palette';
import { downloadBlob } from './download';

/**
 * PDF есеп: кесте, күндер, графиктер, есептеулер және дерек көзінің мәртебесі.
 * Қазақ әріптері үшін Unicode қаріп (DejaVu Sans, ішкі жиын) енгізіледі.
 */
interface ReportInput {
  analytics: AnalyticsResult;
  demo: boolean;
  author: { student: string; grade: string; supervisor: string };
  filter: 'all' | 'school' | 'weekend';
  conclusions: string[];
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Қаріп жүктелмеді: ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const INK = hex('#17263C');
const MUTED = hex('#6B7A90');
const LINE = hex('#E3E9F1');

export async function buildReport({ analytics: a, demo, author, filter, conclusions }: ReportInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const [reg, bold] = await Promise.all([toBase64(`${import.meta.env.BASE_URL}fonts/DejaVuSans-kz.ttf`), toBase64(`${import.meta.env.BASE_URL}fonts/DejaVuSans-Bold-kz.ttf`)]);
  doc.addFileToVFS('DejaVu.ttf', reg);
  doc.addFont('DejaVu.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('DejaVu-Bold.ttf', bold);
  doc.addFont('DejaVu-Bold.ttf', 'DejaVu', 'bold');
  doc.setFont('DejaVu', 'normal');

  const W = 210;
  const M = 16;
  const CW = W - 2 * M;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > 297 - 16) {
      doc.addPage();
      y = M;
    }
  };
  const text = (s: string, size = 10, opts: { bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    doc.setFont('DejaVu', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lines = doc.splitTextToSize(s, CW) as string[];
    const lh = size * 0.42;
    for (const l of lines) {
      ensure(lh + 1);
      doc.text(l, M, y + lh * 0.8);
      y += lh;
    }
    y += opts.gap ?? 1.5;
  };
  const heading = (s: string, need = 14) => {
    ensure(need);
    y += 3;
    text(s, 13, { bold: true, gap: 2 });
  };
  const table = (head: string[], rows: string[][], widths?: number[]) => {
    const ws = widths ?? head.map(() => CW / head.length);
    const rowH = 6.4;
    const drawRow = (cells: string[], isHead: boolean) => {
      ensure(rowH);
      if (isHead) {
        doc.setFillColor(246, 249, 252);
        doc.rect(M, y, CW, rowH, 'F');
      }
      doc.setDrawColor(...LINE);
      doc.line(M, y + rowH, M + CW, y + rowH);
      doc.setFont('DejaVu', isHead ? 'bold' : 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(...(isHead ? MUTED : INK));
      let x = M;
      cells.forEach((c, i) => {
        const t = (doc.splitTextToSize(c, ws[i] - 2) as string[])[0] ?? '';
        if (i === 0) doc.text(t, x + 1.5, y + 4.4);
        else doc.text(t, x + ws[i] - 1.5, y + 4.4, { align: 'right' });
        x += ws[i];
      });
      y += rowH;
    };
    drawRow(head, true);
    rows.forEach((r) => drawRow(r, false));
    y += 3;
  };

  // --- Тақырып ---
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(M, y, 10, 10, 2, 2, 'F');
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('AK', M + 5, y + 6.5, { align: 'center' });
  doc.setTextColor(...INK);
  doc.setFontSize(15);
  doc.text('AQYLDY KÜN — зерттеу есебі', M + 14, y + 7);
  y += 15;
  text(PROJECT.fullTitle, 11, { bold: true });
  text(`${PROJECT.contest}. ${PROJECT.section}.`, 9, { color: MUTED });
  if (author.student) text(`Автор: ${author.student}, ${author.grade}. Ғылыми жетекші: ${author.supervisor}.`, 9, { color: MUTED });
  text(`Есеп жасалған күн: ${new Date().toLocaleString('kk-KZ')}`, 9, { color: MUTED, gap: 3 });

  // --- Дерек көзі мәртебесі ---
  ensure(16);
  const [r, g, b] = demo ? hex('#FFF6E5') : hex('#E7F6F4');
  doc.setFillColor(r, g, b);
  doc.setDrawColor(...(demo ? hex('#F59E0B') : hex('#0D9488')));
  doc.roundedRect(M, y, CW, 14, 2, 2, 'FD');
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...(demo ? hex('#A35F00') : hex('#0D9488')));
  doc.text(demo ? 'ДЕРЕК КӨЗІ: ҮЛГІ ДЕРЕК (зерттеу жұмысы, 2.4-кесте) — нақты бақылау емес' : 'ДЕРЕК КӨЗІ: НАҚТЫ ЗЕРТТЕУ (оқушының күнделігі)', M + 4, y + 6);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(...INK);
  doc.text(`Күн саны: ${a.n}. Сүзгі: ${filter === 'all' ? 'барлық күндер' : filter === 'school' ? 'оқу күндері' : 'демалыс күндері'}. Салыстыру әдісі: ${METHOD_LABELS[a.compare.method]}.`, M + 4, y + 11);
  y += 19;

  if (a.n === 0) {
    text('Деректер жоқ — ешқандай тұжырым жасалмайды.', 11, { bold: true });
  } else {
    // --- 1. Күнделік кестесі ---
    heading('1. Бақылау деректері (минут)');
    table(
      ['Күн', 'Түрі', 'Үй тапс.', 'Экран', 'Кітап', 'Қозғалыс', 'Жосп. тыс'],
      a.entries.map((e) => [dayLabel(e), e.dayType === 'school' ? 'оқу' : 'демалыс', ...METRICS.map((m) => String(e.fact[m]))]),
      [26, 18, 26.8, 26.8, 26.8, 26.8, 26.8],
    );

    // --- 2. Орташа мәндер ---
    heading('2. Орташа мәндер: M = Σxᵢ / n', 50);
    table(
      ['Көрсеткіш', 'Есептеу', 'M, мин'],
      METRICS.map((m) => [METRIC_LABELS[m], `(${a.entries.map((e) => e.fact[m]).join(' + ')}) / ${a.n}`, a.avg[m] === null ? '—' : fmtNumber(a.avg[m]!)]),
      [40, 112, 26],
    );

    // --- Бағанды диаграмма ---
    ensure(62);
    const chartH = 46;
    const max = Math.max(1, ...METRICS.map((m) => a.avg[m] ?? 0));
    const bw = CW / METRICS.length;
    doc.setDrawColor(...LINE);
    doc.line(M, y + chartH, M + CW, y + chartH);
    METRICS.forEach((m, i) => {
      const v = a.avg[m] ?? 0;
      const h = (v / max) * (chartH - 8);
      doc.setFillColor(...hex(METRIC_COLORS[m]));
      doc.roundedRect(M + i * bw + bw * 0.25, y + chartH - h, bw * 0.5, h, 1, 1, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text(fmtNumber(v), M + i * bw + bw / 2, y + chartH - h - 1.5, { align: 'center' });
      doc.setTextColor(...MUTED);
      doc.text(METRIC_LABELS[m], M + i * bw + bw / 2, y + chartH + 4.5, { align: 'center' });
    });
    y += chartH + 10;

    // --- Сызықтық график ---
    if (a.n >= 2) {
      heading('3. Күндер бойынша өзгеріс', 78);
      const h = 48;
      const ymax = Math.max(1, ...a.entries.flatMap((e) => METRICS.map((m) => e.fact[m])));
      const x0 = M + 8;
      const w = CW - 10;
      doc.setDrawColor(...LINE);
      for (let k = 0; k <= 4; k++) {
        const yy = y + h - (k / 4) * h;
        doc.line(x0, yy, x0 + w, yy);
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(fmtNumber((ymax * k) / 4, 0), x0 - 1.5, yy + 1, { align: 'right' });
      }
      const px = (i: number) => x0 + (a.n === 1 ? w / 2 : (i / (a.n - 1)) * w);
      METRICS.forEach((m) => {
        doc.setDrawColor(...hex(METRIC_COLORS[m]));
        doc.setLineWidth(0.6);
        a.entries.forEach((e, i) => {
          const yy = y + h - (e.fact[m] / ymax) * h;
          if (i > 0) {
            const prev = y + h - (a.entries[i - 1].fact[m] / ymax) * h;
            doc.line(px(i - 1), prev, px(i), yy);
          }
          doc.setFillColor(...hex(METRIC_COLORS[m]));
          doc.circle(px(i), yy, 0.8, 'F');
        });
      });
      doc.setLineWidth(0.2);
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      a.entries.forEach((e, i) => {
        if (a.n <= 14) doc.text(dayLabel(e), px(i), y + h + 4, { align: 'center' });
      });
      y += h + 8;
      let lx = M;
      METRICS.forEach((m) => {
        doc.setFillColor(...hex(METRIC_COLORS[m]));
        doc.rect(lx, y - 2.2, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...INK);
        doc.text(METRIC_LABELS[m], lx + 4.5, y);
        lx += 6 + doc.getTextWidth(METRIC_LABELS[m]) + 4;
      });
      y += 5;
    }

    // --- Кезеңдерді салыстыру ---
    heading(`4. Кезеңдерді салыстыру: ${METHOD_LABELS[a.compare.method]}`);
    if (!a.compare.available) {
      text(`Салыстыру жүргізілмеді: ${a.compare.reason}`, 10);
    } else {
      text('Формулалар: айырма = B − A; пайыздық өзгеріс P = (B − A) / A × 100% (A ≠ 0).', 9, { color: MUTED });
      table(
        ['Көрсеткіш', `A: ${a.compare.labelA}`, `B: ${a.compare.labelB}`, 'B − A', 'P'],
        METRICS.map((m) => {
          const c = a.compare.byMetric[m];
          return [METRIC_LABELS[m], c.meanA === null ? '—' : fmtNumber(c.meanA), c.meanB === null ? '—' : fmtNumber(c.meanB), c.diff === null ? '—' : fmtSigned(c.diff), fmtPercent(c.pct, 1, true)];
        }),
        [42, 38, 38, 30, 30],
      );
      METRICS.forEach((m) => {
        const c = a.compare.byMetric[m];
        if (c.meanA !== null && c.meanB !== null && c.pct !== null) text(`${METRIC_LABELS[m]}: P = (${fmtNumber(c.meanB)} − ${fmtNumber(c.meanA)}) / ${fmtNumber(c.meanA)} × 100% = ${fmtPercent(c.pct, 1, true)}`, 8.6, { gap: 0.6 });
      });
      y += 2;
    }

    // --- Жоспар / факт ---
    if (a.planFact.length) {
      heading('5. Жоспар және факт: Δ = факт − жоспар');
      table(
        ['Күн', 'Көрсеткіш', 'Жоспар', 'Факт', 'Δ'],
        a.planFact.map((r) => [r.date, METRIC_LABELS[r.metric], String(r.plan), String(r.fact), fmtSigned(r.delta, 0)]),
        [32, 50, 32, 32, 32],
      );
    }
  }

  heading('Қорытынды');
  conclusions.forEach((c) => text(`• ${c}`, 9.5));
  y += 2;
  text('Шектеулер: ' + PROJECT.limitations.join(' '), 8.5, { color: MUTED });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('DejaVu', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`AQYLDY KÜN · ${demo ? 'ҮЛГІ ДЕРЕК' : 'НАҚТЫ ЗЕРТТЕУ'}`, M, 297 - 8);
    doc.text(`${i} / ${pages}`, W - M, 297 - 8, { align: 'right' });
  }
  const blob = doc.output('blob');
  downloadBlob(`aqyldy-kun-esep-${demo ? 'ulgi' : 'naqty'}-${new Date().toISOString().slice(0, 10)}.pdf`, blob);
  return blob;
}
