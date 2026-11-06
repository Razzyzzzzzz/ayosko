import { budgetStatuses } from './budgetAlerts.js';
import { OVERALL } from '../utils/categories.js';

const pad = (n) => String(n).padStart(2, '0');
const r2 = (n) => Math.round(n * 100) / 100;
const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const label = (c) => c.charAt(0).toUpperCase() + c.slice(1);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Pure function: raw transactions -> everything the Finance dashboard shows.
export function buildFinanceSummary({ month, rows, budgets, today }) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isCurrent = today.slice(0, 7) === month;
  const daysElapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    trend.push({ month: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`, income: 0, expense: 0 });
  }
  const trendMap = Object.fromEntries(trend.map((t) => [t.month, t]));
  const cur = [];
  for (const r of rows) {
    const k = r.spent_on.slice(0, 7);
    if (trendMap[k]) trendMap[k][r.type] += Number(r.amount);
    if (k === month) cur.push(r);
  }
  trend.forEach((t) => { t.income = r2(t.income); t.expense = r2(t.expense); });

  const expenses = cur.filter((r) => r.type === 'expense');
  const incomes = cur.filter((r) => r.type === 'income');
  const { income, expense } = trendMap[month];
  const prev = trend[4];
  const balance = r2(income - expense);
  const dailyAvg = daysElapsed ? r2(expense / daysElapsed) : 0;
  const projected = isCurrent ? r2(dailyAvg * daysInMonth) : expense;

  const group = (list) => list.reduce((o, r) => ((o[r.category] = (o[r.category] || 0) + Number(r.amount)), o), {});
  const catTotals = group(expenses);
  const statuses = budgetStatuses(expenses, budgets);
  const budgetOf = Object.fromEntries(statuses.filter((s) => s.category !== OVERALL).map((s) => [s.category, s]));
  const byCategory = [...new Set([...Object.keys(catTotals), ...Object.keys(budgetOf)])].map((category) => {
    const t = r2(catTotals[category] || 0); const b = budgetOf[category];
    return { category, total: t, pct: expense ? r2((t / expense) * 100) : 0, budget: b?.limit ?? null, used_pct: b?.used_pct ?? null };
  }).sort((a, b) => b.total - a.total);
  const incomeTotals = group(incomes);
  const incomeByCategory = Object.entries(incomeTotals).map(([category, t]) => ({ category, total: r2(t), pct: income ? r2((t / income) * 100) : 0 })).sort((a, b) => b.total - a.total);
  const overall = statuses.find((s) => s.category === OVERALL);

  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, expense: 0 }));
  const byWeekday = DAYS.map((day) => ({ day, total: 0 }));
  for (const e of expenses) {
    daily[Number(e.spent_on.slice(8, 10)) - 1].expense += Number(e.amount);
    byWeekday[new Date(`${e.spent_on}T00:00:00Z`).getUTCDay()].total += Number(e.amount);
  }
  daily.forEach((d) => (d.expense = r2(d.expense)));
  byWeekday.forEach((d) => (d.total = r2(d.total)));
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)
    .map((e) => ({ id: e.id, description: e.description, category: e.category, amount: Number(e.amount), spent_on: e.spent_on }));

  const alerts = statuses.filter((s) => s.level !== 'ok');
  const insights = [];
  if (!cur.length) insights.push('No transactions recorded this month yet. Add income and expenses to see your habits.');
  else {
    if (income > 0 && balance >= 0) insights.push(`You’ve kept ${Math.round((balance / income) * 100)}% of your income this month (${peso(balance)} left).`);
    if (balance < 0) insights.push(`You’ve spent ${peso(-balance)} more than you earned this month.`);
    if (prev.expense > 0 && expense > 0) {
      const basis = isCurrent ? projected : expense;
      const chg = Math.round(((basis - prev.expense) / prev.expense) * 100);
      if (Math.abs(chg) >= 3) insights.push(isCurrent
        ? `At this pace you’ll spend ${peso(projected)} this month, ${Math.abs(chg)}% ${chg > 0 ? 'more' : 'less'} than last month (${peso(prev.expense)}).`
        : `You spent ${Math.abs(chg)}% ${chg > 0 ? 'more' : 'less'} than the month before (${peso(expense)} vs ${peso(prev.expense)}).`);
    }
    const top = byCategory[0];
    if (top?.total > 0) insights.push(`${label(top.category)} is your biggest expense at ${Math.round(top.pct)}% of spending (${peso(top.total)}).`);
    for (const a of alerts) {
      const n = a.category === OVERALL ? 'monthly' : label(a.category);
      insights.push(a.level === 'over' ? `You’re over your ${n} budget by ${peso(a.spent - a.limit)}.` : `You’ve used ${Math.round(a.used_pct)}% of your ${n} budget.`);
    }
    const peak = [...byWeekday].sort((a, b) => b.total - a.total)[0];
    if (peak.total > 0 && expenses.length >= 5) insights.push(`You spend the most on ${peak.day}s (${peso(peak.total)} this month).`);
    const small = expenses.filter((e) => Number(e.amount) < 200);
    const smallSum = small.reduce((s, e) => s + Number(e.amount), 0);
    if (small.length >= 5 && expense && smallSum / expense >= 0.15)
      insights.push(`${small.length} small purchases under ${peso(200)} add up to ${peso(smallSum)} (${Math.round((smallSum / expense) * 100)}% of spending).`);
  }

  return {
    month, is_current: isCurrent, days_elapsed: daysElapsed, days_in_month: daysInMonth,
    income, expense, balance, prev_income: prev.income, prev_expense: prev.expense, count: cur.length,
    daily_avg: dailyAvg, projected, overall_budget: overall ?? null,
    by_category: byCategory, income_by_category: incomeByCategory, trend, daily, by_weekday: byWeekday,
    top_expenses: topExpenses, alerts, insights: insights.slice(0, 7),
  };
}
