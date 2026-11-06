import { OVERALL } from '../utils/categories.js';
import { TransactionModel } from '../models/transaction.model.js';

const r2 = (n) => Math.round(n * 100) / 100;
const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
export const NEAR_PCT = 80;

// Spend vs limit for every budget (overall + per category). Pure function.
export function budgetStatuses(expenses, budgets) {
  const byCat = {}; let total = 0;
  for (const e of expenses) { const a = Number(e.amount); total += a; byCat[e.category] = (byCat[e.category] || 0) + a; }
  return budgets.map((b) => {
    const limit = Number(b.monthly_limit);
    const spent = b.category === OVERALL ? total : byCat[b.category] || 0;
    const used = limit ? (spent / limit) * 100 : 0;
    return { id: b.id, category: b.category, limit, spent: r2(spent), used_pct: r2(used), level: used >= 100 ? 'over' : used >= NEAR_PCT ? 'near' : 'ok' };
  });
}

export function alertRows(userId, month, statuses) {
  return statuses.filter((s) => s.level !== 'ok').map((s) => {
    const overall = s.category === OVERALL;
    const name = overall ? 'Monthly' : `${s.category.charAt(0).toUpperCase()}${s.category.slice(1)}`;
    return {
      user_id: userId, type: 'budget', ref_id: s.id, dedupe_key: `budget:${s.category}:${month}:${s.level}`,
      title: s.level === 'over' ? (overall ? 'Over your monthly budget' : `Over budget: ${name}`) : `${name} budget almost used (${Math.round(s.used_pct)}%)`,
      body: s.level === 'over' ? `${peso(s.spent - s.limit)} over (${peso(s.spent)} of ${peso(s.limit)})` : `${peso(s.limit - s.spent)} left of ${peso(s.limit)}`,
    };
  });
}

export const monthRange = (month) => {
  const [y, m] = month.split('-').map(Number);
  return [`${month}-01`, new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)];
};

// Called right after a user saves an expense, so alerts appear immediately (the hourly job is the backstop).
export async function syncBudgetAlerts(db, userId, month) {
  const { data: prefs } = await db.from('notification_preferences').select('budgets').eq('user_id', userId).maybeSingle();
  if (prefs && prefs.budgets === false) return;
  const [start, end] = monthRange(month);
  const [{ data: budgets }, expenses] = await Promise.all([db.from('budgets').select('*'), TransactionModel.fetchRange(db, start, end, { type: 'expense' })]);
  const rows = alertRows(userId, month, budgetStatuses(expenses, budgets ?? []));
  if (rows.length) await db.from('notifications').upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
}
