import { useMemo } from 'react';
import { daysInMonth, isoDate, monthKey, parseISODate, shiftMonth } from './format';
import { useStore, type Goal, type Profile, type Subscription, type Transaction } from './store';

export interface MonthSummary {
  key: string;
  isCurrent: boolean;
  baseIncome: number;
  extraIncome: number;
  income: number;
  variableExpenses: number;
  fixedExpenses: number;
  expenses: number;
  saved: number;
  available: number;
  /** Expected balance at month end if the current daily pace continues. */
  projectedEnd: number;
  byCategory: { id: string; amount: number }[];
  /** Cumulative spending per day (index 0 = day 1). */
  cumulative: number[];
  daysElapsed: number;
  totalDays: number;
}

function activeSubsFor(subs: Subscription[], key: string) {
  return subs.filter((s) => s.active && (s.since ?? '0000-00') <= key);
}

export function summarize(
  profile: Profile,
  transactions: Transaction[],
  subscriptions: Subscription[],
  key: string,
): MonthSummary {
  const now = new Date();
  const currentKey = monthKey(now);
  const isCurrent = key === currentKey;
  const totalDays = daysInMonth(key);
  const daysElapsed = key < currentKey ? totalDays : isCurrent ? now.getDate() : 0;

  const startedKey = monthKey(profile.createdAt);
  const baseIncome = key >= startedKey ? profile.monthlyIncome : 0;

  const txs = transactions.filter((t) => t.date.startsWith(key));
  let extraIncome = 0;
  let variableExpenses = 0;
  let saved = 0;
  const cats = new Map<string, number>();
  const perDay = new Array<number>(totalDays).fill(0);

  for (const t of txs) {
    if (t.type === 'income') extraIncome += t.amount;
    else if (t.type === 'saving') saved += t.amount;
    else {
      variableExpenses += t.amount;
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
      perDay[parseISODate(t.date).getDate() - 1] += t.amount;
    }
  }

  const subs = activeSubsFor(subscriptions, key);
  const fixedExpenses = subs.reduce((a, s) => a + s.amount, 0);
  if (fixedExpenses) cats.set('subscriptions', (cats.get('subscriptions') ?? 0) + fixedExpenses);
  for (const s of subs) perDay[Math.min(s.day, totalDays) - 1] += s.amount;

  const cumulative: number[] = [];
  perDay.reduce((acc, v, i) => (cumulative[i] = acc + v), 0);

  const income = baseIncome + extraIncome;
  const expenses = variableExpenses + fixedExpenses;
  const available = income - expenses - saved;

  let projectedEnd = available;
  if (isCurrent && daysElapsed > 0) {
    const pace = variableExpenses / daysElapsed;
    projectedEnd = available - pace * (totalDays - daysElapsed);
  } else if (key > currentKey) {
    projectedEnd = available;
  }

  return {
    key, isCurrent, baseIncome, extraIncome, income, variableExpenses, fixedExpenses, expenses, saved,
    available, projectedEnd, cumulative, daysElapsed, totalDays,
    byCategory: [...cats.entries()].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount),
  };
}

export function goalSaved(goalId: string, transactions: Transaction[]) {
  return transactions.reduce((a, t) => (t.type === 'saving' && t.goalId === goalId ? a + t.amount : a), 0);
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one entry. */
export function streak(transactions: Transaction[]) {
  const days = new Set(transactions.map((t) => t.date));
  const d = new Date();
  if (!days.has(isoDate(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(isoDate(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface Health {
  score: number;
  label: string;
  tips: string[];
}

/** Deterministic 0–100 score from real data only. */
export function health(sum: MonthSummary, goals: Goal[], transactions: Transaction[]): Health | null {
  if (sum.income <= 0 || transactions.length === 0) return null;
  const tips: string[] = [];

  // 40 pts — savings rate (target 20% of income).
  const rate = Math.max(0, sum.saved) / sum.income;
  const savingPts = Math.min(1, rate / 0.2) * 40;
  if (rate < 0.2) tips.push('Tenta guardar pelo menos 20% do rendimento num cofre.');

  // 35 pts — projected spending vs income.
  const projectedSpend = sum.income - sum.saved - sum.projectedEnd;
  const ratio = projectedSpend / sum.income;
  const spendPts = ratio <= 0.7 ? 35 : ratio >= 1 ? 0 : ((1 - ratio) / 0.3) * 35;
  if (ratio > 0.85) tips.push('Ao ritmo atual vais gastar quase tudo o que ganhas este mês.');

  // 10 pts — has at least one goal.
  const goalPts = goals.length ? 10 : 0;
  if (!goals.length) tips.push('Cria um cofre — um fundo de emergência é um bom começo.');

  // 15 pts — logged something on each of the last 7 days.
  const recent = new Set(transactions.map((t) => t.date));
  let logged = 0;
  for (let i = 0; i < 7; i++) if (recent.has(isoDate(new Date(Date.now() - i * 864e5)))) logged++;
  const habitPts = (logged / 7) * 15;
  if (logged < 4) tips.push('Regista as despesas diariamente para teres uma visão real.');

  const score = Math.round(savingPts + spendPts + goalPts + habitPts);
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Boa' : score >= 40 ? 'Razoável' : 'Fraca';
  return { score, label, tips };
}

export function useProfile() {
  const p = useStore((s) => s.profile);
  if (!p) throw new Error('Perfil em falta');
  return p;
}

export function useMonth(key = monthKey(new Date())) {
  const profile = useProfile();
  const transactions = useStore((s) => s.transactions);
  const subscriptions = useStore((s) => s.subscriptions);
  return useMemo(() => summarize(profile, transactions, subscriptions, key), [profile, transactions, subscriptions, key]);
}

export function usePrevMonth(key: string) {
  return useMonth(shiftMonth(key, -1));
}

export function nextCharge(sub: Subscription) {
  const now = new Date();
  const dim = daysInMonth(monthKey(now));
  const today = now.getDate();
  const day = Math.min(sub.day, dim);
  if (day >= today) return { date: new Date(now.getFullYear(), now.getMonth(), day), inDays: day - today };
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextDay = Math.min(sub.day, daysInMonth(monthKey(next)));
  next.setDate(nextDay);
  return { date: next, inDays: Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), today).getTime()) / 864e5) };
}
