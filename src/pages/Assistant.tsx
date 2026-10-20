import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useMoney } from '../components/bits';
import { getCategory } from '../lib/categories';
import { health, useMonth, useProfile, type MonthSummary } from '../lib/finance';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';
import { useStore, type Goal, type Subscription, type Transaction } from '../lib/store';

interface Msg {
  from: 'me' | 'bot';
  text: string;
  verdict?: 'yes' | 'careful' | 'no';
}

const SUGGESTIONS = ['Posso comprar algo de 150?', 'Onde gasto mais?', 'Como posso poupar mais?', 'Resumo do mês'];

type Fmt = ReturnType<typeof useMoney>;

function parseAmount(text: string) {
  const m = text.replace(/\s/g, '').match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

function answer(
  text: string, m: MonthSummary, prev: MonthSummary, ctx: { goals: Goal[]; transactions: Transaction[]; subscriptions: Subscription[] }, fmt: Fmt,
): Msg {
  const t = text.toLowerCase();
  const price = parseAmount(t);
  const days = m.totalDays - m.daysElapsed;

  if (price && price > 0) {
    const afterNow = m.available - price;
    const afterEnd = m.projectedEnd - price;
    const buffer = Math.max(50, m.income * 0.1);
    const surplus = m.projectedEnd + m.saved; // what a typical month leaves before saving
    const lines = [
      `Disponível agora: ${fmt(m.available)} → ${fmt(afterNow)} depois da compra.`,
      `Previsão para o fim do mês: ${fmt(afterEnd)} (faltam ${days} dias).`,
    ];
    if (m.income > 0) {
      lines.push(`Isto é ${Math.round((price / m.income) * 100)}% do teu rendimento — cerca de ${Math.max(1, Math.round(price / (m.income / 168)))} horas de trabalho.`);
    }
    if (afterEnd >= buffer) {
      return { from: 'bot', verdict: 'yes', text: `${lines.join('\n')}\n\nCabe no orçamento e ainda ficas com margem.` };
    }
    if (afterEnd >= 0) {
      return { from: 'bot', verdict: 'careful', text: `${lines.join('\n')}\n\nDá, mas ficas com pouca margem até ao fim do mês. Se puderes, espera pelo próximo salário.` };
    }
    const plan = surplus > 0
      ? `Se guardares ${fmt(Math.min(price, Math.ceil(surplus * 0.5)))} por mês num cofre, consegues em ${Math.ceil(price / Math.max(1, Math.ceil(surplus * 0.5)))} mês(es).`
      : 'Neste momento estás a gastar mais do que ganhas — corta primeiro nas maiores categorias.';
    return { from: 'bot', verdict: 'no', text: `${lines.join('\n')}\n\nAgora não — ficarias a negativo. ${plan}` };
  }

  if (/onde|gasto mais|categor/.test(t)) {
    if (!m.byCategory.length) return { from: 'bot', text: 'Ainda não registaste despesas este mês. Adiciona algumas e eu digo-te para onde vai o dinheiro.' };
    const top = m.byCategory.slice(0, 3).map((c, i) => `${i + 1}. ${getCategory(c.id).label}: ${fmt(c.amount)} (${Math.round((c.amount / m.expenses) * 100)}%)`);
    const first = m.byCategory[0];
    const before = prev.byCategory.find((c) => c.id === first.id)?.amount ?? 0;
    const cmp = before > 0 && first.id !== 'subscriptions' ? `\n\nEm ${monthLabel(prev.key).toLowerCase()} gastaste ${fmt(before)} em ${getCategory(first.id).label.toLowerCase()}.` : '';
    return { from: 'bot', text: `Este mês o teu dinheiro foi para:\n${top.join('\n')}${cmp}` };
  }

  if (/poup|guardar|economi/.test(t)) {
    const tips: string[] = [];
    const subsTotal = ctx.subscriptions.filter((s) => s.active).reduce((a, s) => a + s.amount, 0);
    if (subsTotal > 0) tips.push(`Revê os pagamentos fixos: são ${fmt(subsTotal)}/mês (${fmt(subsTotal * 12)}/ano).`);
    const top = m.byCategory.find((c) => c.id !== 'subscriptions');
    if (top) tips.push(`Cortar 20% em ${getCategory(top.id).label.toLowerCase()} poupa ${fmt(top.amount * 0.2)} este mês.`);
    if (m.income > 0) tips.push(`Regra 50/30/20: tenta guardar ${fmt(m.income * 0.2)} por mês assim que recebes.`);
    if (!ctx.goals.length) tips.push('Cria um cofre com um objetivo concreto — é mais fácil poupar para algo.');
    return { from: 'bot', text: tips.length ? `Algumas ideias:\n• ${tips.join('\n• ')}` : 'Regista algumas despesas e define o teu rendimento para te dar dicas concretas.' };
  }

  if (/mensal|fixo|subscri|assinatura/.test(t)) {
    const active = ctx.subscriptions.filter((s) => s.active);
    if (!active.length) return { from: 'bot', text: 'Não tens pagamentos fixos registados. Adiciona-os em Início → Fixos para entrarem nas previsões.' };
    const total = active.reduce((a, s) => a + s.amount, 0);
    return { from: 'bot', text: `Tens ${active.length} pagamentos fixos: ${fmt(total)}/mês, ${fmt(total * 12)}/ano.\n${active.map((s) => `• ${s.name}: ${fmt(s.amount)} (dia ${s.day})`).join('\n')}` };
  }

  // Default: monthly summary / what to improve.
  const h = health(m, ctx.goals, ctx.transactions);
  const lines = [
    `${monthLabel(m.key)}: entraram ${fmt(m.income)}, saíram ${fmt(m.expenses)} e guardaste ${fmt(m.saved)}.`,
    `Disponível: ${fmt(m.available)}. Previsão para o fim do mês: ${fmt(m.projectedEnd)}.`,
  ];
  if (h) lines.push(`Saúde financeira: ${h.score}/100 (${h.label.toLowerCase()}).${h.tips[0] ? `\nA melhorar: ${h.tips[0]}` : ''}`);
  else lines.push('Define o teu rendimento mensal no perfil para uma análise completa.');
  return { from: 'bot', text: lines.join('\n') };
}

export function Assistant() {
  const profile = useProfile();
  const fmt = useMoney();
  const { goals, transactions, subscriptions } = useStore();
  const key = monthKey(new Date());
  const m = useMonth(key);
  const prev = useMonth(shiftMonth(key, -1));
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: `Olá, ${profile.name.split(' ')[0]}! Analiso os teus dados — que ficam só neste dispositivo — e respondo com números reais.\n\nEscreve um valor para saber se podes comprar algo.` },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((x) => [...x, { from: 'me', text: q }, answer(q, m, prev, { goals, transactions, subscriptions }, (v, o) => fmt(v, { ...o, show: true }))]);
    setInput('');
  };

  const V = { yes: [CheckCircle2, 'Sim, podes', 'var(--pos)'], careful: [AlertTriangle, 'Com cuidado', 'var(--warn)'], no: [XCircle, 'Agora não', 'var(--neg)'] } as const;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 'calc(var(--safe-bottom) + 160px)' }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="cat-icon" style={{ background: 'linear-gradient(135deg, var(--hero-1), var(--hero-2))' }}><Sparkles size={20} /></span>
        <h1 className="title" style={{ margin: 0 }}>Assistente</h1>
      </div>
      <p className="subtitle" style={{ marginTop: 6 }}>Posso comprar isto? Onde gasto mais? Pergunta.</p>

      <div>
        {msgs.map((msg, i) => (
          <div key={i} className={`bubble ${msg.from}`}>
            {msg.verdict && (() => {
              const [Icon, label, color] = V[msg.verdict];
              return <div className="verdict" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, marginBottom: 8 }}><Icon size={17} /> {label}</div>;
            })()}
            <div>{msg.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, bottom: 'calc(var(--safe-bottom) + 66px)', padding: '10px 16px', background: 'var(--bg)', borderTop: '1px solid var(--line)', zIndex: 20 }}>
        <div className="chips" style={{ margin: '0 -16px 8px' }}>
          {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
        </div>
        <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <input className="input" style={{ flex: 1, borderRadius: 26 }} placeholder="Ex.: posso comprar uns ténis de 120?" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="icon-btn" type="submit" style={{ width: 52, height: 52, background: 'var(--accent)', color: '#fff' }} disabled={!input.trim()} aria-label="Enviar">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
