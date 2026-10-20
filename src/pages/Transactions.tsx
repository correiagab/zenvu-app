import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Receipt, X } from 'lucide-react';
import { Empty, TxRow, useMoney } from '../components/bits';
import { getCategory } from '../lib/categories';
import { dayLabel, monthKey, monthLabel, shiftMonth } from '../lib/format';
import { useStore, type Transaction } from '../lib/store';
import { useUI } from '../lib/ui';

type Filter = 'all' | 'expense' | 'income' | 'saving';

export function Transactions() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const fmt = useMoney();
  const transactions = useStore((s) => s.transactions);
  const openAdd = useUI((s) => s.openAdd);

  const current = monthKey(new Date());
  const [month, setMonth] = useState(current);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(params.has('procurar'));

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    return transactions
      .filter((t) => (q ? true : t.date.startsWith(month)))
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => !q || t.note.toLowerCase().includes(q) || getCategory(t.category).label.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [transactions, month, filter, q]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of list) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()];
  }, [list]);

  const net = (txs: Transaction[]) => txs.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Voltar"><ArrowLeft size={20} /></button>
        <h1>Movimentos</h1>
        <button className="icon-btn" onClick={() => { setSearching(!searching); setQuery(''); }} aria-label="Procurar">
          {searching ? <X size={20} /> : <Search size={20} />}
        </button>
      </div>

      {searching ? (
        <input className="input" autoFocus placeholder="Procurar por descrição ou categoria" value={query}
          onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />
      ) : (
        <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 12px' }}>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <b>{monthLabel(month, true)}</b>
          <button className="icon-btn" disabled={month >= current} style={{ opacity: month >= current ? 0.3 : 1 }}
            onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mês seguinte"><ChevronRight size={20} /></button>
        </div>
      )}

      <div className="chips" style={{ marginBottom: 14 }}>
        {([['all', 'Todos'], ['expense', 'Despesas'], ['income', 'Receitas'], ['saving', 'Cofres']] as const).map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <Empty icon={<Receipt size={26} />} title={q ? 'Nada encontrado' : 'Sem movimentos'}
            text={q ? `Nenhum movimento corresponde a “${query}”.` : `Não há movimentos em ${monthLabel(month).toLowerCase()}.`}
            action={!q && <button className="btn sm" onClick={() => openAdd('expense')}>Adicionar</button>} />
        </div>
      ) : (
        groups.map(([date, txs]) => (
          <div key={date} style={{ marginBottom: 12 }}>
            <div className="list-head" style={{ padding: '6px 4px' }}>
              <span>{dayLabel(date)}</span>
              <span className="num">{fmt(net(txs), { sign: true })}</span>
            </div>
            <div className="list">{txs.map((t) => <TxRow key={t.id} tx={t} />)}</div>
          </div>
        ))
      )}
    </div>
  );
}
