import type { ReactNode } from 'react';
import { getCategory } from '../lib/categories';
import { money, shortDate } from '../lib/format';
import { useStore, type Transaction } from '../lib/store';
import { useUI } from '../lib/ui';

export function useMoney() {
  const currency = useStore((s) => s.profile?.currency ?? 'EUR');
  const hidden = useStore((s) => s.hideValues);
  return (v: number, opts: { sign?: boolean; cents?: boolean; show?: boolean } = {}) =>
    money(v, currency, { hidden: hidden && !opts.show, sign: opts.sign, cents: opts.cents });
}

export function CatIcon({ id, size = 40 }: { id: string; size?: number }) {
  const c = getCategory(id);
  const Icon = c.icon;
  return (
    <span className="cat-icon" style={{ background: c.color, width: size, height: size }}>
      <Icon size={size * 0.48} strokeWidth={2.2} />
    </span>
  );
}

export function TxRow({ tx, showDate }: { tx: Transaction; showDate?: boolean }) {
  const fmt = useMoney();
  const openTx = useUI((s) => s.openTx);
  const cat = getCategory(tx.category);
  const signed = tx.type === 'income' ? tx.amount : -tx.amount;
  const sub = [showDate ? shortDate(tx.date) : null, tx.note ? cat.label : null]
    .filter(Boolean).join(' · ');
  return (
    <button className="list-item" onClick={() => openTx(tx.id)}>
      <CatIcon id={tx.category} />
      <div className="main">
        <div className="t1">{tx.note || cat.label}</div>
        {sub && <div className="t2">{sub}</div>}
      </div>
      <div className={`end num ${signed > 0 ? 'pos' : ''}`}>{fmt(signed, { sign: true })}</div>
    </button>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="em-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 12, color = 'var(--accent)', children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.6s' }} />
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

/** Donut made of category segments. */
export function Donut({ parts, size = 168, stroke = 18, children }: {
  parts: { value: number; color: string }[]; size?: number; stroke?: number; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0);
  const gap = parts.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-2)" strokeWidth={stroke} />
        {total > 0 && parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

/** Cumulative spending line for this month vs. last month. */
export function SpendChart({ current, previous, upTo, height = 120 }: {
  current: number[]; previous: number[]; upTo: number; height?: number;
}) {
  const w = 320;
  const days = Math.max(current.length, previous.length);
  const max = Math.max(1, ...current.slice(0, upTo), ...previous) * 1.1;
  const x = (i: number) => (i / Math.max(1, days - 1)) * w;
  const y = (v: number) => height - (v / max) * (height - 8) - 4;
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const cur = current.slice(0, Math.max(1, upTo));
  const last = cur.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {previous.length > 0 && (
        <path d={path(previous)} fill="none" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
      )}
      <path d={`${path(cur)} L${x(last)},${height} L0,${height} Z`} fill="url(#spendFill)" />
      <path d={path(cur)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(cur[last] ?? 0)} r="4" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}

export function Toast() {
  const toast = useUI((s) => s.toast);
  return toast ? <div className="toast" role="status">{toast}</div> : null;
}
