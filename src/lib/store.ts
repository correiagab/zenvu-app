import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isoDate, monthKey, uid, type CurrencyCode } from './format';
import type { TxType } from './categories';

export interface Profile {
  name: string;
  currency: CurrencyCode;
  /** Net monthly income, counted automatically every month. */
  monthlyIncome: number;
  /** Optional monthly spending limit (0 = none). */
  spendingLimit: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TxType | 'saving';
  /** Always positive for income/expense. For 'saving', positive = into goal, negative = out of goal. */
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  goalId?: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  deadline?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  day: number; // day of month it is charged
  active: boolean;
  /** First month (YYYY-MM) this charge counts toward. */
  since: string;
}

export type Theme = 'system' | 'dark' | 'light';

interface State {
  profile: Profile | null;
  transactions: Transaction[];
  goals: Goal[];
  subscriptions: Subscription[];
  hideValues: boolean;
  theme: Theme;

  completeOnboarding: (p: Omit<Profile, 'createdAt' | 'spendingLimit'>) => void;
  updateProfile: (p: Partial<Profile>) => void;
  toggleHidden: () => void;
  setTheme: (t: Theme) => void;

  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => string;
  updateGoal: (id: string, g: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  moveToGoal: (goalId: string, amount: number) => void;

  addSubscription: (s: Omit<Subscription, 'id' | 'active' | 'since'>) => void;
  updateSubscription: (id: string, s: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;

  importData: (json: string) => void;
  resetAll: () => void;
}

const empty = { profile: null, transactions: [], goals: [], subscriptions: [], hideValues: false, theme: 'system' as Theme };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,

      completeOnboarding: (p) => set({ profile: { ...p, spendingLimit: 0, createdAt: isoDate() } }),
      updateProfile: (p) => set((s) => (s.profile ? { profile: { ...s.profile, ...p } } : s)),
      toggleHidden: () => set((s) => ({ hideValues: !s.hideValues })),
      setTheme: (theme) => set({ theme }),

      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid(), createdAt: Date.now() }, ...s.transactions] })),
      updateTransaction: (id, t) =>
        set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),

      addGoal: (g) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...g, id, createdAt: isoDate() }] }));
        return id;
      },
      updateGoal: (id, g) => set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...g } : x)) })),
      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((x) => x.id !== id),
          // Money saved in a deleted goal returns to the available balance.
          transactions: s.transactions.filter((t) => t.goalId !== id),
        })),
      moveToGoal: (goalId, amount) => {
        const goal = get().goals.find((g) => g.id === goalId);
        if (!goal || !amount) return;
        get().addTransaction({
          type: 'saving',
          amount,
          category: 'saving',
          note: amount > 0 ? `Para ${goal.name}` : `De ${goal.name}`,
          date: isoDate(),
          goalId,
        });
      },

      addSubscription: (sub) => set((s) => ({ subscriptions: [...s.subscriptions, { ...sub, id: uid(), active: true, since: monthKey(new Date()) }] })),
      updateSubscription: (id, sub) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...sub } : x)) })),
      deleteSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),

      importData: (json) => {
        const data = JSON.parse(json);
        if (!data || typeof data !== 'object' || !data.profile || !Array.isArray(data.transactions)) {
          throw new Error('Ficheiro inválido');
        }
        set({
          profile: data.profile,
          transactions: data.transactions,
          goals: data.goals ?? [],
          subscriptions: data.subscriptions ?? [],
        });
      },
      resetAll: () => set({ ...empty }),
    }),
    { name: 'zenvu-v1', version: 1 },
  ),
);

export function exportData() {
  const { profile, transactions, goals, subscriptions } = useStore.getState();
  return JSON.stringify({ app: 'zenvu', version: 1, exportedAt: new Date().toISOString(), profile, transactions, goals, subscriptions }, null, 2);
}
