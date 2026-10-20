import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Home as HomeIcon, PieChart, PiggyBank, Sparkles, Plus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useStore } from './lib/store';
import { useUI } from './lib/ui';
import { TxSheet } from './components/TxSheet';
import { Toast } from './components/bits';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Transactions } from './pages/Transactions';
import { Analytics } from './pages/Analytics';
import { Goals } from './pages/Goals';
import { Assistant } from './pages/Assistant';
import { Subscriptions } from './pages/Subscriptions';
import { Profile } from './pages/Profile';

const TABS = [
  { to: '/', label: 'Início', icon: HomeIcon },
  { to: '/analises', label: 'Análises', icon: PieChart },
  { to: '/cofres', label: 'Cofres', icon: PiggyBank },
  { to: '/assistente', label: 'Assistente', icon: Sparkles },
];

const TITLES: Record<string, string> = {
  '/': 'Zenvu',
  '/movimentos': 'Movimentos · Zenvu',
  '/analises': 'Análises · Zenvu',
  '/cofres': 'Cofres · Zenvu',
  '/assistente': 'Assistente · Zenvu',
  '/mensalidades': 'Mensalidades · Zenvu',
  '/perfil': 'Perfil · Zenvu',
};

function useTheme() {
  const theme = useStore((s) => s.theme);
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      // Home has a dark gradient hero, so its status bar text is always light.
      const lightText = dark || pathname === '/';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f3f7');
      if (Capacitor.isNativePlatform()) StatusBar.setStyle({ style: lightText ? Style.Dark : Style.Light }).catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme, pathname]);
}

export function App() {
  const profile = useStore((s) => s.profile);
  const openAdd = useUI((s) => s.openAdd);
  const { pathname } = useLocation();
  useTheme();

  useEffect(() => {
    document.title = TITLES[pathname] ?? 'Zenvu';
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!profile) return <div className="app"><Onboarding /></div>;

  const showTabs = TABS.some((t) => t.to === pathname);
  const showFab = pathname === '/movimentos';

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movimentos" element={<Transactions />} />
        <Route path="/analises" element={<Analytics />} />
        <Route path="/cofres" element={<Goals />} />
        <Route path="/assistente" element={<Assistant />} />
        <Route path="/mensalidades" element={<Subscriptions />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showFab && (
        <button className={`fab${showTabs ? '' : ' low'}`} aria-label="Adicionar movimento" onClick={() => openAdd('expense')}>
          <Plus size={28} />
        </button>
      )}

      {showTabs && (
        <nav className="tabbar">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `tab${isActive ? ' on' : ''}`}>
              <Icon size={24} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      <TxSheet />
      <Toast />
    </div>
  );
}
