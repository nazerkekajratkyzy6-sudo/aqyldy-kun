/** Қазақша сан пішімі: ондық бөлгіш — үтір, мыңдық — бос орын. */
export function fmtNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  const fixed = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
  const [int, frac] = fixed.replace('-', '').split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = rounded < 0 ? '−' : '';
  return frac ? `${sign}${intFmt},${frac}` : `${sign}${intFmt}`;
}

/** Таңбасымен: +10, −5, 0 */
export function fmtSigned(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  if (value > 0) return `+${fmtNumber(value, digits)}`;
  return fmtNumber(value, digits);
}

export function fmtPercent(value: number | null, digits = 1, signed = false): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${signed ? fmtSigned(value, digits) : fmtNumber(value, digits)}%`;
}

/** "2026-10-23" → "23.10.2026" */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
