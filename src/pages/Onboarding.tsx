import { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Smartphone, EyeOff } from 'lucide-react';
import { CURRENCIES, currencySymbol, type CurrencyCode } from '../lib/format';
import { useStore } from '../lib/store';

export function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [income, setIncome] = useState('');

  if (step === 0) {
    return (
      <div className="welcome">
        <div className="logo">Z</div>
        <div className="spacer" />
        <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.04em', margin: '0 0 14px' }}>
          O teu dinheiro,<br />claro e simples.
        </h1>
        <p style={{ opacity: 0.8, fontSize: 17, margin: '0 0 28px' }}>
          Regista despesas em segundos, vê para onde vai cada euro e poupa para o que importa.
        </p>
        <div style={{ display: 'grid', gap: 14, marginBottom: 32, fontSize: 15 }}>
          {[
            [Smartphone, 'Tudo guardado só no teu telemóvel'],
            [Lock, 'Sem contas, sem anúncios, sem venda de dados'],
            [EyeOff, 'Esconde valores com um toque'],
          ].map(([Icon, text], i) => {
            const I = Icon as typeof Lock;
            return (
              <div key={i} className="row" style={{ opacity: 0.9, alignItems: 'flex-start' }}>
                <I size={20} /> {text as string}
              </div>
            );
          })}
        </div>
        <button className="btn block" style={{ background: '#fff', color: '#111' }} onClick={() => setStep(1)}>
          Começar
        </button>
      </div>
    );
  }

  const incomeValue = Number(income.replace(',', '.')) || 0;
  const canNext = step === 1 ? name.trim().length > 0 : step === 2 ? true : incomeValue >= 0;

  const next = () => {
    if (!canNext) return;
    if (step < 3) setStep(step + 1);
    else complete({ name: name.trim(), currency, monthlyIncome: incomeValue });
  };

  return (
    <form className="onb" onSubmit={(e) => { e.preventDefault(); next(); }}>
      <div className="row" style={{ marginBottom: 20 }}>
        <button type="button" className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Voltar"><ArrowLeft size={20} /></button>
      </div>
      <div className="steps">{[1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 1 && (
        <>
          <h1>Como te chamas?</h1>
          <p className="muted">É assim que te vamos tratar na app.</p>
          <input className="big-input" autoFocus placeholder="O teu nome" value={name} maxLength={30}
            autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
        </>
      )}

      {step === 2 && (
        <>
          <h1>A tua moeda</h1>
          <p className="muted">Podes mudar mais tarde no perfil.</p>
          <div className="list" style={{ marginTop: 12 }}>
            {CURRENCIES.map((c) => (
              <button type="button" key={c.code} className="list-item" onClick={() => setCurrency(c.code)}>
                <span className="cat-icon" style={{ background: currency === c.code ? 'var(--accent)' : 'var(--card-2)', color: currency === c.code ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 13 }}>
                  {currencySymbol(c.code)}
                </span>
                <div className="main"><div className="t1">{c.label}</div><div className="t2">{c.code}</div></div>
                <span style={{ width: 22, height: 22, borderRadius: 11, border: '2px solid', borderColor: currency === c.code ? 'var(--accent)' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
                  {currency === c.code && <i style={{ width: 12, height: 12, borderRadius: 6, background: 'var(--accent)' }} />}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Rendimento mensal</h1>
          <p className="muted">Líquido, depois de impostos. Entra automaticamente todos os meses — podes deixar a 0 e registar receitas à mão.</p>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: 'var(--text-2)' }}>{currencySymbol(currency)}</span>
            <input className="big-input num" autoFocus inputMode="decimal" placeholder="0" value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^\d,.]/g, ''))} />
          </div>
        </>
      )}

      <div className="spacer" />
      <button type="submit" className="btn block" disabled={!canNext}>
        {step < 3 ? <>Continuar <ArrowRight size={18} /></> : 'Concluir'}
      </button>
    </form>
  );
}
