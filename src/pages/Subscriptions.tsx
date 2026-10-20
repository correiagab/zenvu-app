import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Repeat, Trash2 } from 'lucide-react';
import { CatIcon, Empty, useMoney } from '../components/bits';
import { Sheet } from '../components/Sheet';
import { nextCharge } from '../lib/finance';
import { currencySymbol } from '../lib/format';
import { useStore, type Subscription } from '../lib/store';
import { useUI } from '../lib/ui';

export function Subscriptions() {
  const nav = useNavigate();
  const fmt = useMoney();
  const subscriptions = useStore((s) => s.subscriptions);
  const [editing, setEditing] = useState<Subscription | 'new' | null>(null);
  const active = subscriptions.filter((s) => s.active);
  const total = active.reduce((a, s) => a + s.amount, 0);
  const sorted = [...subscriptions].sort((a, b) => Number(b.active) - Number(a.active) || nextCharge(a).inDays - nextCharge(b).inDays);

  return (
    <div className="page no-tabs">
      <div className="topbar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Voltar"><ArrowLeft size={20} /></button>
        <h1>Pagamentos fixos</h1>
        <button className="icon-btn" onClick={() => setEditing('new')} aria-label="Adicionar"><Plus size={20} /></button>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div className="small muted">Total por mês</div>
        <div className="num" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>{fmt(total)}</div>
        <div className="small muted num">{fmt(total * 12)} por ano</div>
      </div>
      <p className="small muted" style={{ margin: '12px 4px' }}>
        Renda, ginásio, streaming, telemóvel… Entram automaticamente nas despesas de cada mês, a partir do mês em que os adicionas.
      </p>

      {subscriptions.length === 0 ? (
        <div className="card">
          <Empty icon={<Repeat size={26} />} title="Sem pagamentos fixos" text="Adiciona o que pagas todos os meses para as previsões serem certeiras."
            action={<button className="btn sm" onClick={() => setEditing('new')}>Adicionar</button>} />
        </div>
      ) : (
        <div className="list">
          {sorted.map((s) => {
            const { inDays } = nextCharge(s);
            return (
              <button key={s.id} className="list-item" onClick={() => setEditing(s)} style={{ opacity: s.active ? 1 : 0.5 }}>
                <CatIcon id="subscriptions" />
                <div className="main">
                  <div className="t1">{s.name}</div>
                  <div className="t2">{s.active ? `Dia ${s.day} · ${inDays === 0 ? 'hoje' : inDays === 1 ? 'amanhã' : `daqui a ${inDays} dias`}` : 'Em pausa'}</div>
                </div>
                <div className="end num">{fmt(s.amount)}</div>
              </button>
            );
          })}
        </div>
      )}

      <SubEditor sub={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function SubEditor({ sub, onClose }: { sub: Subscription | 'new' | null; onClose: () => void }) {
  const { addSubscription, updateSubscription, deleteSubscription } = useStore();
  const currency = useStore((s) => s.profile?.currency ?? 'EUR');
  const showToast = useUI((s) => s.showToast);
  const existing = sub && sub !== 'new' ? sub : null;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [last, setLast] = useState<typeof sub>(null);

  if (sub !== last) {
    setLast(sub);
    setName(existing?.name ?? '');
    setAmount(existing ? String(existing.amount).replace('.', ',') : '');
    setDay(String(existing?.day ?? new Date().getDate()));
  }

  const amt = Number(amount.replace(',', '.')) || 0;
  const d = Math.min(31, Math.max(1, Number(day) || 1));
  const valid = name.trim() && amt > 0;

  const save = () => {
    if (!valid) return;
    const data = { name: name.trim(), amount: amt, day: d };
    if (existing) updateSubscription(existing.id, data);
    else addSubscription(data);
    showToast(existing ? 'Pagamento atualizado' : 'Pagamento adicionado');
    onClose();
  };

  return (
    <Sheet open={!!sub} onClose={onClose} title={existing ? 'Editar pagamento' : 'Novo pagamento fixo'}>
      <label className="field"><span>Nome</span>
        <input className="input" placeholder="Ex.: Netflix, renda, ginásio" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid-2">
        <label className="field"><span>Valor ({currencySymbol(currency)})</span>
          <input className="input num" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))} />
        </label>
        <label className="field"><span>Dia do mês</span>
          <input className="input num" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
      </div>
      <button className="btn block" disabled={!valid} onClick={save}>{existing ? 'Guardar' : 'Adicionar'}</button>
      {existing && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn secondary" style={{ flex: 1 }} onClick={() => { updateSubscription(existing.id, { active: !existing.active }); onClose(); }}>
            {existing.active ? 'Pausar' : 'Retomar'}
          </button>
          <button className="btn danger" style={{ flex: 1 }} onClick={() => { deleteSubscription(existing.id); onClose(); showToast('Pagamento removido'); }}>
            <Trash2 size={17} /> Remover
          </button>
        </div>
      )}
    </Sheet>
  );
}
