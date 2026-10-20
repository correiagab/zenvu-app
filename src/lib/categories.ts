import {
  ShoppingCart, UtensilsCrossed, Car, Home, Receipt, ShoppingBag, Gamepad2, HeartPulse,
  GraduationCap, Plane, Repeat, CircleEllipsis, Briefcase, Laptop, Gift, TrendingUp, Coins,
  PiggyBank, type LucideIcon,
} from 'lucide-react';

export type TxType = 'expense' | 'income';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  type: TxType;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'groceries', label: 'Supermercado', icon: ShoppingCart, color: '#22C55E', type: 'expense' },
  { id: 'restaurants', label: 'Restaurantes', icon: UtensilsCrossed, color: '#F97316', type: 'expense' },
  { id: 'transport', label: 'Transporte', icon: Car, color: '#3B82F6', type: 'expense' },
  { id: 'home', label: 'Casa', icon: Home, color: '#A855F7', type: 'expense' },
  { id: 'bills', label: 'Contas', icon: Receipt, color: '#EAB308', type: 'expense' },
  { id: 'shopping', label: 'Compras', icon: ShoppingBag, color: '#EC4899', type: 'expense' },
  { id: 'leisure', label: 'Lazer', icon: Gamepad2, color: '#06B6D4', type: 'expense' },
  { id: 'health', label: 'Saúde', icon: HeartPulse, color: '#EF4444', type: 'expense' },
  { id: 'education', label: 'Educação', icon: GraduationCap, color: '#6366F1', type: 'expense' },
  { id: 'travel', label: 'Viagens', icon: Plane, color: '#14B8A6', type: 'expense' },
  { id: 'subscriptions', label: 'Mensalidades', icon: Repeat, color: '#8B5CF6', type: 'expense' },
  { id: 'other', label: 'Outros', icon: CircleEllipsis, color: '#64748B', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salário', icon: Briefcase, color: '#22C55E', type: 'income' },
  { id: 'freelance', label: 'Freelance', icon: Laptop, color: '#3B82F6', type: 'income' },
  { id: 'gift', label: 'Presentes', icon: Gift, color: '#EC4899', type: 'income' },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp, color: '#14B8A6', type: 'income' },
  { id: 'other-income', label: 'Outros', icon: Coins, color: '#64748B', type: 'income' },
];

export const SAVING_CATEGORY: Category = {
  id: 'saving', label: 'Cofre', icon: PiggyBank, color: '#3D5AFE', type: 'expense',
};

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, SAVING_CATEGORY];

export function getCategory(id: string): Category {
  return ALL.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}
