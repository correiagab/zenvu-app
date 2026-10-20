import { useState } from 'react';
import { Plus, PiggyBank, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from 'lucide-react';
import { Empty, Ring, useMoney } from '../components/bits';
import { Sheet } from '../components/Sheet';
import { goalSaved, useMonth } from '../lib/finance';
import { currencySymbol, isoDate, parseISODate } from '../lib/format';
import { useStore, type Goal } from '../lib/store';
import { tap, useUI } from '../lib/ui';

const EMOJIS = ['🛟', '✈️', '🚗', '🏠', '💻', '📱', '🎓', '💍', '🎁', '🏖️', '🎮', '💰'];

export function Goals() {
  const fmt = useMoney();
  const { goals, transactions } = useStore();
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const total = goals.reduce((a, g) => a + goalSaved(g.id, transactions), 0);

  return (
    <div className="page">
      <div className="row">
        <h1 className="title" style={{ flex: 1 }}>Cofres</h1>
        <button className="icon-btn" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => setEditing('new')} aria-label="Novo cofre">
          <Plus size={22} />
        </button>
      </div>
      <p className="subtitle">Total guardado: <b className="num" style={{ color: 'var(--text)' }}>{fmt(total)}</b></p>

      {goals.length === 0 ? (
        <div className="card">
          <Empty icon={<PiggyBank size={26} />} title="Sem cofres" text="Separa dinheiro para os teus objetivos. Fica fora do saldo disponível para não o gastares."
            action={<button className="btn sm" onClick={() => setEditing('new')}>Criar cofre</button>} />
        </div>
      ) : (
        <div className="list">
          {goals.map((g) => {
            const saved = goalSaved(g.id, transactions);
            const pct = g.target > 0 ? saved / g.target : 0;
            return (
              <button key={g.id} className="list-item" onClick={() => setSelected(g.id)}>
                <Ring value={pct} size={48} stroke={4} color={pct >= 1 ? 'var(--pos)' : 'var(--accent)'}>
                  <span style={{ fontSize: 20 }}>{g.emoji}</span>
                </Ring>
                <div className="main">
                  <div className="t1">{g.name}</div>
                  <div className="t2 num">{pct >= 1 ? 'Objetivo atingido 🎉' : `${Math.round(pct * 100)}% de ${fmt(g.target)}`}</div>
                </div>
                <div className="end num">{fmt(saved)}</div>
              </button>
            );
          })}
        </div>
      )}

      <GoalEditor goal={editing} onClose={() => setEditing(null)} />
      <GoalDetail id={selected} onClose={() => setSelected(null)} onEdit={(g) => { setSelected(null); setEditing(g); }} />
    </div>
  );
}

function GoalEditor({ goal, onClose }: { goal: Goal | 'new' | null; onClose: () => void }) {
  const { addGoal, updateGoal } = useStore();
  const currency = useStore((s) => s.profile?.currency ?? 'EUR');
  const showToast = useUI((s) => s.showToast);
  const existing = goal && goal !== 'new' ? goal : null;
  const [emoji, setEmoji] = useState('🛟');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [lastGoal, setLastGoal] = useState<typeof goal>(null);

  // Reset form whenever the sheet opens for a different goal.
  if (goal !== lastGoal) {
    setLastGoal(goal);
    setEmoji(existing?.emoji ?? '🛟');
    setName(existing?.name ?? '');
    setTarget(existing ? String(existing.target).replace('.', ',') : '');
    setDeadline(existing?.deadline ?? '');
  }

  const targetNum = Number(target.replace(',', '.')) || 0;
  const valid = name.trim() && targetNum > 0;

  const save = () => {
    if (!valid) return;
    const data = { emoji, name: name.trim(), target: targetNum, deadline: deadline || undefined };
    if (existing) updateGoal(existing.id, data);
    else addGoal(data);
    showToast(existing ? 'Cofre atualizado' : 'Cofre criado');
    onClose();
  };

  return (
    <Sheet open={!!goal} onClose={onClose} title={existing ? 'Editar cofre' : 'Novo cofre'}>
      <div className="chips" style={{ marginBottom: 16 }}>
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className="chip"
            style={{ width: 48, height: 48, borderRadius: 24, fontSize: 24, justifyContent: 'center', padding: 0, outline: emoji === e ? '2px solid var(--accent)' : 'none' }}>
            {e}
          </button>
        ))}
      </div>
      <label className="field"><span>Nome</span>
        <input className="input" placeholder="Ex.: Fundo de emergência" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field"><span>Objetivo ({currencySymbol(currency)})</span>
        <input className="input num" inputMode="decimal" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d,.]/g, ''))} />
      </label>
      <label className="field"><span>Data limite (opcional)</span>
        <input className="input" type="date" min={isoDate()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <button className="btn block" disabled={!valid} onClick={save}>{existing ? 'Guardar' : 'Criar cofre'}</button>
    </Sheet>
  );
}

function GoalDetail({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const fmt = useMoney();
  const { goals, transactions, moveToGoal, deleteGoal } = useStore();
  const currency = useStore((s) => s.profile?.currency ?? 'EUR');
  const showToast = useUI((s) => s.showToast);
  const m = useMonth();
  const goal = goals.find((g) => g.id === id);
  const [mode, setMode] = useState<'in' | 'out' | 'delete' | null>(null);
  const [amount, setAmount] = useState('');

  if (!goal) return null;
  const saved = goalSaved(goal.id, transactions);
  const left = Math.max(0, goal.target - saved);
  const value = Number(amount.replace(',', '.')) || 0;

  let monthsLeft = 0;
  if (goal.deadline) {
    const d = parseISODate(goal.deadline);
    const now = new Date();
    monthsLeft = Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
  }

  const close = () => { setMode(null); setAmount(''); onClose(); };
  const confirm = () => {
    if (mode === 'in' && value > 0) { moveToGoal(goal.id, value); tap('medium'); showToast(`${fmt(value, { show: true })} guardados em ${goal.name}`); }
    if (mode === 'out' && value > 0 && value <= saved) { moveToGoal(goal.id, -value); showToast(`${fmt(value, { show: true })} retirados`); }
    setMode(null); setAmount('');
  };

  return (
    <Sheet open onClose={close} title={`${goal.emoji}\u00A0 ${goal.name}`}
      headerEnd={<button className="icon-btn" style={{ width: 32, height: 32, background: 'var(--card-2)' }} aria-label="Editar" onClick={() => onEdit(goal)}><Pencil size={15} /></button>}>
      <div style={{ display: 'grid', placeItems: 'center', margin: '8px 0 20px' }}>
        <Ring value={goal.target ? saved / goal.target : 0} size={150} stroke={12} color={saved >= goal.target ? 'var(--pos)' : 'var(--accent)'}>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{fmt(saved)}</div>
          <div className="small muted num">de {fmt(goal.target)}</div>
        </Ring>
      </div>

      {left > 0 && (
        <div className="card" style={{ background: 'var(--card-2)', marginBottom: 16 }}>
          <div className="small muted">
            Faltam <b className="num" style={{ color: 'var(--text)' }}>{fmt(left)}</b>.{' '}
            {goal.deadline
              ? <>Para chegares lá até {parseISODate(goal.deadline).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}, guarda <b className="num" style={{ color: 'var(--text)' }}>{fmt(left / monthsLeft)}/mês</b>.</>
              : <>Guardando {fmt(Math.max(10, Math.ceil(left / 12)))}/mês chegas lá em cerca de {Math.ceil(left / Math.max(10, Math.ceil(left / 12)))} meses.</>}
          </div>
        </div>
      )}

      {mode === 'in' || mode === 'out' ? (
        <>
          <label className="field">
            <span>{mode === 'in' ? `Adicionar ao cofre · disponível ${fmt(m.available)}` : `Retirar do cofre · máx. ${fmt(saved)}`}</span>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700 }} className="muted">{currencySymbol(currency)}</span>
              <input className="input num" autoFocus inputMode="decimal" placeholder="0" value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))} />
            </div>
          </label>
          {mode === 'in' && left > 0 && (
            <div className="chips" style={{ marginBottom: 14 }}>
              {[10, 25, 50, 100].map((v) => <button key={v} className="chip" onClick={() => setAmount(String(v))}>{fmt(v, { show: true })}</button>)}
              <button className="chip" onClick={() => setAmount(String(left).replace('.', ','))}>Tudo o que falta</button>
            </div>
          )}
          {mode === 'out' && value > saved && <p className="small neg">Não podes retirar mais do que tens no cofre.</p>}
          <div className="row">
            <button className="btn secondary" style={{ flex: 1 }} onClick={() => setMode(null)}>Cancelar</button>
            <button className="btn" style={{ flex: 1 }} disabled={value <= 0 || (mode === 'out' && value > saved)} onClick={confirm}>Confirmar</button>
          </div>
        </>
      ) : mode === 'delete' ? (
        <div className="empty" style={{ paddingTop: 0 }}>
          <h3>Apagar este cofre?</h3>
          <p>{saved > 0 ? `Os ${fmt(saved)} guardados voltam para o teu saldo disponível.` : 'Esta ação não pode ser desfeita.'}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => setMode(null)}>Cancelar</button>
            <button className="btn danger" onClick={() => { deleteGoal(goal.id); close(); showToast('Cofre apagado'); }}>Apagar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row">
            <button className="btn" style={{ flex: 1 }} onClick={() => setMode('in')}><ArrowDownToLine size={18} /> Adicionar</button>
            <button className="btn secondary" style={{ flex: 1 }} disabled={saved <= 0} onClick={() => setMode('out')}><ArrowUpFromLine size={18} /> Retirar</button>
          </div>
          <button className="btn danger block" style={{ marginTop: 10 }} onClick={() => setMode('delete')}><Trash2 size={17} /> Apagar cofre</button>
        </>
      )}
    </Sheet>
  );
}
