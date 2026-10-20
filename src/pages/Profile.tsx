import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, User, Coins, Wallet, Gauge, Moon, Download, Upload, Trash2, Repeat, Flame, Eye } from 'lucide-react';
import { useMoney } from '../components/bits';
import { Sheet } from '../components/Sheet';
import { streak, useProfile } from '../lib/finance';
import { CURRENCIES, currencySymbol, initials, parseISODate, type CurrencyCode } from '../lib/format';
import { exportData, useStore, type Theme } from '../lib/store';
import { useUI } from '../lib/ui';

type Field = 'name' | 'currency' | 'income' | 'limit' | 'theme' | 'reset' | null;

function Row({ icon, label, value, onClick, danger }: { icon: ReactNode; label: string; value?: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button className="list-item" onClick={onClick} style={danger ? { color: 'var(--neg)' } : undefined}>
      <span className="cat-icon" style={{ background: danger ? 'rgba(255,90,95,0.14)' : 'var(--card-2)', color: danger ? 'var(--neg)' : 'var(--text)', width: 36, height: 36 }}>{icon}</span>
      <div className="main"><div className="t1">{label}</div></div>
      {value !== undefined && <span className="muted num" style={{ fontSize: 15 }}>{value}</span>}
      {!danger && <ChevronRight size={18} className="faint" />}
    </button>
  );
}

export function Profile() {
  const nav = useNavigate();
  const profile = useProfile();
  const fmt = useMoney();
  const { updateProfile, theme, setTheme, transactions, importData, resetAll, hideValues, toggleHidden } = useStore();
  const showToast = useUI((s) => s.showToast);
  const [field, setField] = useState<Field>(null);
  const [draft, setDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (f: Field, initial = '') => { setDraft(initial); setField(f); };
  const close = () => setField(null);
  const num = Number(draft.replace(',', '.')) || 0;

  const download = async () => {
    const json = exportData();
    const name = `zenvu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    // iOS (app and Safari) handles files best through the share sheet.
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Cópia de segurança Zenvu' }); return; } catch { /* cancelled */ return; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    showToast('Cópia de segurança criada');
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      importData(await f.text());
      showToast('Dados restaurados');
    } catch {
      showToast('Ficheiro inválido');
    }
  };

  const since = parseISODate(profile.createdAt).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <div className="page no-tabs">
      <div className="topbar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Voltar"><ArrowLeft size={20} /></button>
        <h1>Perfil</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <div className="avatar lg" style={{ margin: '0 auto 12px' }}>{initials(profile.name)}</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{profile.name}</div>
        <div className="small muted">No Zenvu desde {since} · <Flame size={13} style={{ verticalAlign: -2 }} /> {streak(transactions)} dias seguidos</div>
      </div>

      <div className="list">
        <Row icon={<User size={18} />} label="Nome" value={profile.name} onClick={() => open('name', profile.name)} />
        <Row icon={<Coins size={18} />} label="Moeda" value={profile.currency} onClick={() => open('currency')} />
        <Row icon={<Wallet size={18} />} label="Rendimento mensal" value={fmt(profile.monthlyIncome)} onClick={() => open('income', profile.monthlyIncome ? String(profile.monthlyIncome).replace('.', ',') : '')} />
        <Row icon={<Gauge size={18} />} label="Limite de gastos" value={profile.spendingLimit ? fmt(profile.spendingLimit) : 'Nenhum'} onClick={() => open('limit', profile.spendingLimit ? String(profile.spendingLimit).replace('.', ',') : '')} />
        <Row icon={<Repeat size={18} />} label="Pagamentos fixos" onClick={() => nav('/mensalidades')} />
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        <Row icon={<Moon size={18} />} label="Aspeto" value={{ system: 'Automático', dark: 'Escuro', light: 'Claro' }[theme]} onClick={() => open('theme')} />
        <Row icon={<Eye size={18} />} label="Esconder valores" value={hideValues ? 'Sim' : 'Não'} onClick={toggleHidden} />
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        <Row icon={<Download size={18} />} label="Exportar cópia de segurança" onClick={download} />
        <Row icon={<Upload size={18} />} label="Restaurar cópia de segurança" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        <Row icon={<Trash2 size={18} />} label="Apagar todos os dados" danger onClick={() => open('reset')} />
      </div>

      <p className="small faint" style={{ textAlign: 'center', marginTop: 20 }}>
        Os teus dados ficam guardados apenas neste dispositivo.<br />Zenvu 1.0
      </p>

      <Sheet open={field === 'name'} onClose={close} title="Nome">
        <input className="input" autoFocus value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn block" style={{ marginTop: 14 }} disabled={!draft.trim()} onClick={() => { updateProfile({ name: draft.trim() }); close(); }}>Guardar</button>
      </Sheet>

      <Sheet open={field === 'currency'} onClose={close} title="Moeda">
        <p className="small muted" style={{ marginTop: 0 }}>Só muda o símbolo apresentado — os valores não são convertidos.</p>
        <div className="list" style={{ background: 'var(--card-2)' }}>
          {CURRENCIES.map((c) => (
            <button key={c.code} className="list-item" onClick={() => { updateProfile({ currency: c.code as CurrencyCode }); close(); }}>
              <b style={{ width: 36 }}>{currencySymbol(c.code)}</b>
              <div className="main"><div className="t1">{c.label}</div></div>
              {profile.currency === c.code && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={field === 'income' || field === 'limit'} onClose={close} title={field === 'income' ? 'Rendimento mensal' : 'Limite de gastos mensal'}>
        <p className="small muted" style={{ marginTop: 0 }}>
          {field === 'income' ? 'Valor líquido que recebes todos os meses. Entra automaticamente.' : 'Recebes um aviso visual quando te aproximares. Deixa vazio para não usar.'}
        </p>
        <input className="input num" autoFocus inputMode="decimal" placeholder="0" value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^\d,.]/g, ''))} />
        <button className="btn block" style={{ marginTop: 14 }} onClick={() => { updateProfile(field === 'income' ? { monthlyIncome: num } : { spendingLimit: num }); close(); }}>Guardar</button>
      </Sheet>

      <Sheet open={field === 'theme'} onClose={close} title="Aspeto">
        <div className="seg">
          {(['system', 'dark', 'light'] as Theme[]).map((t) => (
            <button key={t} className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
              {{ system: 'Automático', dark: 'Escuro', light: 'Claro' }[t]}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={field === 'reset'} onClose={close} title="Apagar tudo?">
        <p className="muted" style={{ marginTop: 0 }}>Todos os movimentos, cofres e definições são apagados deste dispositivo. Exporta uma cópia de segurança antes se quiseres guardar.</p>
        <button className="btn danger block" onClick={() => { resetAll(); nav('/'); }}>Apagar tudo</button>
      </Sheet>
    </div>
  );
}
