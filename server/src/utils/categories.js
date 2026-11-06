// Single source of truth for built-in categories and their colors.

// Budget "category" value that means the overall monthly limit.
export const OVERALL = 'overall';

export const INCOME_CATEGORIES = ['salary', 'freelance', 'business', 'allowance', 'gift', 'investment', 'other'];

export const EXPENSE_CATEGORIES = ['food', 'transport', 'bills', 'rent', 'groceries', 'health', 'education', 'shopping', 'entertainment', 'savings', 'other'];

export const CATEGORIES = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
};

export const BUDGET_CATEGORIES = [OVERALL, ...EXPENSE_CATEGORIES];

// Built-in category names for a transaction type ('income' | 'expense').
export const defaultsFor = (type) => CATEGORIES[type] ?? [];

export const FALLBACK_COLOR = '#94a3b8';

export const DEFAULT_COLORS = {
  // expense
  food: '#f97316',
  transport: '#3b82f6',
  bills: '#ef4444',
  rent: '#8b5cf6',
  groceries: '#22c55e',
  health: '#ec4899',
  education: '#06b6d4',
  shopping: '#eab308',
  entertainment: '#a855f7',
  savings: '#14b8a6',
  // income
  salary: '#16a34a',
  freelance: '#0ea5e9',
  business: '#f59e0b',
  allowance: '#84cc16',
  gift: '#f43f5e',
  investment: '#6366f1',
  // shared
  other: FALLBACK_COLOR,
};