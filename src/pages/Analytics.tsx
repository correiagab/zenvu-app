import { useState } from 'react';
import { ChevronLeft, ChevronRight, PieChart, Lightbulb } from 'lucide-react';
import { CatIcon, Donut, Empty, Ring, SpendChart, useMoney } from '../components/bits';
import { getCategory } from '../lib/categories';
import { health, useMonth, useProfile } from '../lib/finance';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { scoreColor } from './Home';

export function Analytics() {
  const fmt = useMoney();
  const profile = useProfile();
  const { goals, transactions } = useStore();
  const openAdd = useUI((s) => s.openAdd);
  const current = monthKey(new Date());
  const [key, setKey] = useState(current);
  const m = useMonth(key);
  const prev = useMonth(shiftMonth(key, -1));
  const h = m.isCurrent ? health(m, goals, transactions) : null;
  const limit = profile.spendingLimit;

  return (
    <div className="page">
      <h1 className="title">Análises</h1>
      <div className="row" style={{ justifyContent: 'space-between', margin: '8px 0 16px' }}>
        <button className="icon-btn" onClick={() => setKey(shiftMonth(key, -1))} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
        <b>{monthLabel(key, true)}</b>
        <button className="icon-btn" disabled={key >= current} style={{ opacity: key >= current ? 0.3 : 1 }}
          onClick={() => setKey(shiftMonth(key, 1))} aria-label="Mês seguinte"><ChevronRight size={20} /></button>
      </div>

      <div className="card">
        <div className="grid-2" style={{ gap: 16 }}>
          <div className="stat">Receitas<b className="num pos">{fmt(m.income)}</b></div>
          <div className="stat">Despesas<b className="num">{fmt(m.expenses)}</b></div>
          <div className="stat">Para cofres<b className="num">{fmt(m.saved)}</b></div>
          <div className="stat">{m.isCurrent ? 'Disponível' : 'Sobrou'}<b className={`num ${m.available < 0 ? 'neg' : ''}`}>{fmt(m.available)}</b></div>
        </div>
        {limit > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="row small" style={{ marginBottom: 6 }}>
              <span className="muted" style={{ flex: 1 }}>Limite de gastos</span>
              <span className="num">{fmt(m.expenses)} / {fmt(limit)}</span>
            </div>
            <div className="bar"><i style={{ width: `${Math.min(100, (m.expenses / limit) * 100)}%`, background: m.expenses > limit ? 'var(--neg)' : m.expenses > limit * 0.8 ? 'var(--warn)' : 'var(--accent)' }} /></div>
          </div>
        )}
      </div>

      {m.expenses === 0 ? (
        <div className="card">
          <Empty icon={<PieChart size={26} />} title="Sem despesas neste mês" text="Quando registares despesas, vês aqui para onde vai o teu dinheiro."
            action={m.isCurrent && <button className="btn sm" onClick={() => openAdd('expense')}>Adicionar despesa</button>} />
        </div>
      ) : (
        <>
          <div className="section-title">Por categoria</div>
          <div className="card" style={{ display: 'grid', placeItems: 'center', paddingTop: 24 }}>
            <Donut parts={m.byCategory.map((c) => ({ value: c.amount, color: getCategory(c.id).color }))}>
              <div className="small muted">Total</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 22 }}>{fmt(m.expenses)}</div>
            </Donut>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {m.byCategory.map((c) => {
              const cat = getCategory(c.id);
              const pct = Math.round((c.amount / m.expenses) * 100);
              return (
                <div key={c.id} className="list-item">
                  <CatIcon id={c.id} />
                  <div className="main">
                    <div className="row" style={{ gap: 6 }}>
                      <span className="t1" style={{ flex: 1 }}>{cat.label}</span>
                      <span className="num" style={{ fontWeight: 600 }}>{fmt(c.amount)}</span>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <div className="bar" style={{ flex: 1, height: 6 }}><i style={{ width: `${pct}%`, background: cat.color }} /></div>
                      <span className="small muted num" style={{ width: 34, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-title">Ritmo de gastos</div>
          <div className="card">
            <SpendChart current={m.cumulative} previous={prev.expenses ? prev.cumulative : []} upTo={m.daysElapsed || m.totalDays} />
            <div className="row small" style={{ marginTop: 10, gap: 16 }}>
              <span className="row" style={{ gap: 6 }}><i style={{ width: 14, height: 3, background: 'var(--accent)', borderRadius: 2 }} />{monthLabel(key)}</span>
              {prev.expenses > 0 && <span className="row muted" style={{ gap: 6 }}><i style={{ width: 14, borderTop: '2px dashed var(--text-3)' }} />{monthLabel(prev.key)}</span>}
            </div>
          </div>
        </>
      )}

      {m.isCurrent && (
        <>
          <div className="section-title">Saúde financeira</div>
          <div className="card">
            {h ? (
              <>
                <div className="row" style={{ gap: 16 }}>
                  <Ring value={h.score / 100} size={84} stroke={9} color={scoreColor(h.score)}>
                    <span className="num" style={{ fontWeight: 700, fontSize: 22 }}>{h.score}</span>
                  </Ring>
                  <div>
                    <b style={{ fontSize: 18 }}>{h.label}</b>
                    <div className="small muted" style={{ marginTop: 2 }}>Calculada com poupança, ritmo de gastos, cofres e registo diário.</div>
                  </div>
                </div>
                {h.tips.map((t) => (
                  <div key={t} className="row small" style={{ marginTop: 12, alignItems: 'flex-start', gap: 10 }}>
                    <Lightbulb size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} /> {t}
                  </div>
                ))}
              </>
            ) : (
              <div className="small muted">Precisamos de um rendimento (no perfil) e de alguns movimentos registados para calcular a tua saúde financeira.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
