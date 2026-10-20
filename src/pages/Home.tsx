import { Link, useNavigate } from 'react-router-dom';
import { Search, BarChart3, Eye, EyeOff, Minus, Plus, PiggyBank, Repeat, Receipt, Sparkles, ChevronRight, Flame } from 'lucide-react';
import { useMemo } from 'react';
import { CatIcon, Empty, Ring, SpendChart, TxRow, useMoney } from '../components/bits';
import { goalSaved, health, nextCharge, streak, useMonth, useProfile } from '../lib/finance';
import { initials, monthKey, monthLabel, shiftMonth, shortDate } from '../lib/format';
import { useStore } from '../lib/store';
import { tap, useUI } from '../lib/ui';

export function Home() {
  const profile = useProfile();
  const nav = useNavigate();
  const fmt = useMoney();
  const { transactions, goals, subscriptions, hideValues, toggleHidden } = useStore();
  const openAdd = useUI((s) => s.openAdd);

  const key = monthKey(new Date());
  const m = useMonth(key);
  const prev = useMonth(shiftMonth(key, -1));
  const h = health(m, goals, transactions);
  const days = streak(transactions);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5),
    [transactions],
  );
  const upcoming = useMemo(
    () => subscriptions.filter((s) => s.active).map((s) => ({ s, ...nextCharge(s) })).sort((a, b) => a.inDays - b.inDays).slice(0, 3),
    [subscriptions],
  );

  const prevSameDay = prev.cumulative[Math.min(m.daysElapsed, prev.totalDays) - 1] ?? 0;
  const spentNow = m.cumulative[m.daysElapsed - 1] ?? 0;
  const diff = prevSameDay > 0 ? Math.round(((spentNow - prevSameDay) / prevSameDay) * 100) : null;

  const [intPart, centPart] = hideValues ? ['••••', ''] : splitMoney(fmt(m.available, { cents: true, show: true }));

  return (
    <div className="page">
      <section className="hero">
        <div className="row" style={{ gap: 10 }}>
          <Link to="/perfil" className="avatar" aria-label="Perfil">{initials(profile.name)}</Link>
          <button className="search-pill" onClick={() => nav('/movimentos?procurar=1')}>
            <Search size={18} /> Procurar
          </button>
          <Link to="/analises" className="icon-btn glass" aria-label="Análises"><BarChart3 size={20} /></Link>
        </div>

        <div className="balance">
          <button className="label" onClick={() => { tap(); toggleHidden(); }} aria-label={hideValues ? 'Mostrar valores' : 'Esconder valores'}>
            Disponível · {monthLabel(key)} {hideValues ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <div className="amount num">
            {intPart}<span className="cents">{centPart}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/analises" className="pill">
              Previsão fim do mês: <span className="num">{fmt(m.projectedEnd)}</span>
            </Link>
          </div>
        </div>

        <div className="actions">
          <button className="action" onClick={() => openAdd('expense')}><span className="circle"><Minus size={22} /></span>Despesa</button>
          <button className="action" onClick={() => openAdd('income')}><span className="circle"><Plus size={22} /></span>Receita</button>
          <Link to="/cofres" className="action"><span className="circle"><PiggyBank size={22} /></span>Cofres</Link>
          <Link to="/mensalidades" className="action"><span className="circle"><Repeat size={21} /></span>Fixos</Link>
        </div>
      </section>

      <div className="card" style={{ marginTop: 16, padding: 0 }}>
        {recent.length ? (
          <>
            <div className="list-head" style={{ paddingTop: 16 }}><span>Movimentos recentes</span></div>
            {recent.map((t) => <TxRow key={t.id} tx={t} showDate />)}
            <Link to="/movimentos" className="list-item" style={{ minHeight: 48, justifyContent: 'center', color: 'var(--accent-2)', fontWeight: 600 }}>
              Ver tudo
            </Link>
          </>
        ) : (
          <Empty icon={<Receipt size={26} />} title="Ainda sem movimentos" text="Regista a tua primeira despesa — leva 3 segundos."
            action={<button className="btn sm" onClick={() => openAdd('expense')}>Adicionar despesa</button>} />
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Link to="/analises" className="card">
          <div className="stat">Gasto este mês<b className="num">{fmt(m.expenses)}</b></div>
          <div className="small" style={{ marginTop: 6, color: diff === null ? 'var(--text-3)' : diff > 0 ? 'var(--neg)' : 'var(--pos)' }}>
            {diff === null ? `Rendimento ${fmt(m.income)}` : `${diff > 0 ? '+' : ''}${diff}% vs ${monthLabel(prev.key).toLowerCase()}`}
          </div>
        </Link>
        <Link to="/analises" className="card row" style={{ gap: 10 }}>
          <Ring value={(h?.score ?? 0) / 100} size={52} stroke={6} color={scoreColor(h?.score)}>
            <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>{h ? h.score : '–'}</span>
          </Ring>
          <div className="stat" style={{ minWidth: 0 }}>Saúde<b style={{ fontSize: 15 }}>{h ? h.label : m.income > 0 ? 'Sem dados' : 'Sem rendimento'}</b></div>
        </Link>
      </div>

      {m.expenses > 0 && (
        <Link to="/analises" className="card" style={{ display: 'block', marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="stat" style={{ flex: 1 }}>Ritmo de gastos</div>
            <span className="small faint">— — {monthLabel(prev.key)}</span>
          </div>
          <SpendChart current={m.cumulative} previous={prev.expenses ? prev.cumulative : []} upTo={m.daysElapsed} height={90} />
        </Link>
      )}

      <div className="section-title">Cofres <Link to="/cofres">Ver todos</Link></div>
      {goals.length ? (
        <div className="chips" style={{ gap: 12 }}>
          {goals.map((g) => {
            const saved = goalSaved(g.id, transactions);
            return (
              <Link to="/cofres" key={g.id} className="card" style={{ minWidth: 160, flexShrink: 0 }}>
                <div style={{ fontSize: 28 }}>{g.emoji}</div>
                <div style={{ fontWeight: 600, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div className="small muted num" style={{ margin: '2px 0 10px' }}>{fmt(saved)} de {fmt(g.target)}</div>
                <div className="bar"><i style={{ width: `${Math.min(100, (saved / g.target) * 100)}%` }} /></div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Link to="/cofres" className="card row">
          <span className="cat-icon" style={{ background: 'var(--accent)' }}><PiggyBank size={20} /></span>
          <div style={{ flex: 1 }}><b>Cria o teu primeiro cofre</b><div className="small muted">Viagem, carro, fundo de emergência…</div></div>
          <ChevronRight size={20} className="faint" />
        </Link>
      )}

      <Link to="/assistente" className="card row" style={{ marginTop: 12, background: 'linear-gradient(135deg, var(--hero-1), var(--hero-2))', color: '#fff' }}>
        <span className="cat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><Sparkles size={20} /></span>
        <div style={{ flex: 1 }}><b>Posso comprar isto?</b><div className="small" style={{ opacity: 0.8 }}>Vê o impacto antes de gastar</div></div>
        <ChevronRight size={20} />
      </Link>

      {upcoming.length > 0 && (
        <>
          <div className="section-title">Próximos pagamentos <Link to="/mensalidades">Gerir</Link></div>
          <div className="list">
            {upcoming.map(({ s, inDays, date }) => (
              <Link to="/mensalidades" key={s.id} className="list-item">
                <CatIcon id="subscriptions" />
                <div className="main">
                  <div className="t1">{s.name}</div>
                  <div className="t2">{inDays === 0 ? 'Hoje' : inDays === 1 ? 'Amanhã' : `${shortDate(date)} · daqui a ${inDays} dias`}</div>
                </div>
                <div className="end num">{fmt(s.amount)}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {days > 1 && (
        <div className="card row" style={{ marginTop: 12 }}>
          <span className="cat-icon" style={{ background: '#FF7A1A' }}><Flame size={20} /></span>
          <div><b>{days} dias seguidos</b><div className="small muted">a registar movimentos. Continua!</div></div>
        </div>
      )}
    </div>
  );
}

function splitMoney(s: string): [string, string] {
  // "1 234,56 €" → ["1 234", ",56 €"]  |  "R$ 1.234,56" → ["R$ 1.234", ",56"]
  const m = s.match(/^(.*\d)([.,]\d{2})(.*)$/);
  return m ? [m[1], m[2] + m[3]] : [s, ''];
}

export function scoreColor(score?: number) {
  if (score === undefined) return 'var(--text-3)';
  return score >= 60 ? 'var(--pos)' : score >= 40 ? 'var(--warn)' : 'var(--neg)';
}
