import { useEffect, useState } from 'react';
import { Delete, Trash2, CalendarDays } from 'lucide-react';
import { Sheet } from './Sheet';
import { CatIcon, useMoney } from './bits';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory, type TxType } from '../lib/categories';
import { currencySymbol, dayLabel, isoDate, symbolFirst } from '../lib/format';
import { useStore } from '../lib/store';
import { tap, useUI } from '../lib/ui';

/** Keypad string → number. Accepts comma as decimal separator. */
function toNumber(s: string) {
  return Number(s.replace(',', '.')) || 0;
}

export function TxSheet() {
  const { addOpen, editTxId, close, showToast } = useUI();
  const tx = useStore((s) => s.transactions.find((t) => t.id === editTxId));
  const currency = useStore((s) => s.profile?.currency ?? 'EUR');
  const { addTransaction, updateTransaction, deleteTransaction } = useStore();
  const fmt = useMoney();

  const open = addOpen !== null || !!tx;
  const [type, setType] = useState<TxType>('expense');
  const [raw, setRaw] = useState('');
  const [category, setCategory] = useState('groceries');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(isoDate());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (tx && tx.type !== 'saving') {
      setType(tx.type);
      setRaw(String(tx.amount).replace('.', ','));
      setCategory(tx.category);
      setNote(tx.note);
      setDate(tx.date);
    } else if (addOpen) {
      setType(addOpen);
      setRaw('');
      setCategory(addOpen === 'income' ? 'salary' : 'groceries');
      setNote('');
      setDate(isoDate());
    }
  }, [open, tx?.id, addOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  // Goal transfers are read-only here; they are managed from the goal itself.
  if (tx?.type === 'saving') {
    return (
      <Sheet open onClose={close} title="Transferência para cofre">
        <div className="amount-display">
          <CatIcon id="saving" size={56} />
          <div className="val num" style={{ marginTop: 12 }}>{fmt(-tx.amount, { sign: true })}</div>
          <div className="muted">{tx.note} · {dayLabel(tx.date)}</div>
        </div>
        <button className="btn danger block" onClick={() => { deleteTransaction(tx.id); close(); showToast('Transferência anulada'); }}>
          <Trash2 size={18} /> Anular transferência
        </button>
      </Sheet>
    );
  }

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const amount = toNumber(raw);

  const press = (k: string) => {
    tap();
    setRaw((r) => {
      if (k === 'del') return r.slice(0, -1);
      if (k === ',') return r.includes(',') ? r : (r || '0') + ',';
      const [, dec] = r.split(',');
      if (dec !== undefined && dec.length >= 2) return r;
      if (r.replace(',', '').length >= 9) return r;
      if (r === '0') return k;
      return r + k;
    });
  };

  const switchType = (t: TxType) => {
    setType(t);
    setCategory(t === 'income' ? 'salary' : 'groceries');
  };

  const save = () => {
    if (amount <= 0) return;
    const data = { type, amount: Math.round(amount * 100) / 100, category, note: note.trim(), date };
    if (tx) updateTransaction(tx.id, data);
    else addTransaction(data);
    tap('medium');
    showToast(tx ? 'Alterações guardadas' : type === 'expense' ? 'Despesa registada' : 'Receita registada');
    close();
  };

  const today = isoDate();
  const yesterday = isoDate(new Date(Date.now() - 864e5));
  const sym = currencySymbol(currency);
  const [int, dec] = raw.split(',');

  return (
    <Sheet
      open
      onClose={close}
      title={tx ? 'Editar' : type === 'expense' ? 'Nova despesa' : 'Nova receita'}
      headerEnd={tx && (
        <button className="icon-btn" style={{ width: 32, height: 32, background: 'var(--card-2)', color: 'var(--neg)' }}
          aria-label="Apagar" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} />
        </button>
      )}
    >
      {confirmDelete && tx ? (
        <div className="empty">
          <h3>Apagar este movimento?</h3>
          <p>{tx.note || getCategory(tx.category).label} · {fmt(tx.amount, { show: true })}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button className="btn danger" onClick={() => { deleteTransaction(tx.id); close(); showToast('Movimento apagado'); }}>Apagar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="seg">
            <button className={type === 'expense' ? 'on' : ''} onClick={() => switchType('expense')}>Despesa</button>
            <button className={type === 'income' ? 'on' : ''} onClick={() => switchType('income')}>Receita</button>
          </div>

          <div className="amount-display">
            <div className={`val num ${raw ? '' : 'placeholder'}`}>
              {type === 'expense' ? '−' : '+'}{symbolFirst(currency) && `${sym} `}{int || '0'}
              {dec !== undefined && <span>,{dec}</span>}
              {!symbolFirst(currency) && <span style={{ fontSize: '0.7em' }}> {sym}</span>}
            </div>
          </div>

          <div className="chips" style={{ paddingBottom: 4 }}>
            {cats.map((c) => (
              <button key={c.id} className={`cat-pick ${category === c.id ? 'on' : ''}`} style={{ width: 74, flexShrink: 0, color: category === c.id ? c.color : undefined }}
                onClick={() => { tap(); setCategory(c.id); }}>
                <CatIcon id={c.id} size={46} />
                <span style={{ color: category === c.id ? 'var(--text)' : undefined, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{c.label}</span>
              </button>
            ))}
          </div>

          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <input className="input" placeholder="Descrição (opcional)" value={note} maxLength={40}
              onChange={(e) => setNote(e.target.value)} style={{ flex: 1, height: 44 }} />
          </div>
          <div className="chips" style={{ marginTop: 8 }}>
            <button className={`chip ${date === today ? 'on' : ''}`} onClick={() => setDate(today)}>Hoje</button>
            <button className={`chip ${date === yesterday ? 'on' : ''}`} onClick={() => setDate(yesterday)}>Ontem</button>
            <label className={`chip ${date !== today && date !== yesterday ? 'on' : ''}`} style={{ position: 'relative' }}>
              <CalendarDays size={15} />
              {date !== today && date !== yesterday ? dayLabel(date) : 'Outra data'}
              <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0 }} aria-label="Escolher data" />
            </label>
          </div>

          <div className="keypad num">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((k) => (
              <button key={k} onClick={() => press(k)}>{k}</button>
            ))}
            <button onClick={() => press('del')} aria-label="Apagar dígito"><Delete size={24} /></button>
          </div>

          <button className="btn block" disabled={amount <= 0} onClick={save}>
            {tx ? 'Guardar' : 'Adicionar'}
          </button>
        </>
      )}
    </Sheet>
  );
}
