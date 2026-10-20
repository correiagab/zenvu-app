export const CURRENCIES = [
  { code: 'EUR', label: 'Euro' },
  { code: 'BRL', label: 'Real' },
  { code: 'USD', label: 'Dólar EUA' },
  { code: 'GBP', label: 'Libra' },
  { code: 'CHF', label: 'Franco suíço' },
  { code: 'CAD', label: 'Dólar canadiano' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, decimals: boolean) {
  const key = `${currency}-${decimals}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'pt-PT', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    formatters.set(key, f);
  }
  return f;
}

/** Formats money; shows cents only when the value has them. */
export function money(value: number, currency: string, opts: { hidden?: boolean; sign?: boolean; cents?: boolean } = {}) {
  if (opts.hidden) return '••••';
  const rounded = Math.round(value * 100) / 100;
  const hasCents = opts.cents ?? !Number.isInteger(rounded);
  const text = formatter(currency, hasCents).format(Math.abs(rounded));
  if (rounded < 0) return `−${text}`;
  if (opts.sign && rounded > 0) return `+${text}`;
  return text;
}

export function currencySymbol(currency: string) {
  return formatter(currency, false).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Local date as YYYY-MM-DD (never UTC, so late-evening entries stay on the right day). */
export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthKey(d: Date | string) {
  const date = typeof d === 'string' ? parseISODate(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, withYear = false) {
  const [y, m] = key.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-PT', { month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayLabel(iso: string) {
  const today = isoDate();
  const yesterday = isoDate(new Date(Date.now() - 864e5));
  if (iso === today) return 'Hoje';
  if (iso === yesterday) return 'Ontem';
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
    .replace(/^./, (c) => c.toUpperCase());
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** True when the currency symbol goes before the number (R$ 10, $10) instead of after (10 €). */
export function symbolFirst(currency: string) {
  const parts = formatter(currency, false).formatToParts(1);
  return parts.findIndex((p) => p.type === 'currency') < parts.findIndex((p) => p.type === 'integer');
}

/** "20 out" */
export function shortDate(iso: string | Date) {
  const d = typeof iso === 'string' ? parseISODate(iso) : iso;
  return `${d.getDate()} ${d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}`;
}
