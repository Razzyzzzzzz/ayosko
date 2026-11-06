import { TransactionModel } from '../models/transaction.model.js';
import { BudgetModel } from '../models/budget.model.js';
import { CategoryModel } from '../models/category.model.js';
import { buildFinanceSummary } from '../services/finance.service.js';
import { OVERALL } from '../utils/categories.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

export const financeController = {
  // GET /finance/summary?month=YYYY-MM&today=YYYY-MM-DD
  summary: asyncHandler(async (req, res) => {
    const today = isDate(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10);
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || '') ? req.query.month : today.slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 6, 1)).toISOString().slice(0, 10); // 6-month window for trends
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [rows, budgets] = await Promise.all([TransactionModel.fetchRange(req.db, start, end), BudgetModel.list(req.db)]);
    res.json({ success: true, data: buildFinanceSummary({ month, rows, budgets, today }) });
  }),
  listBudgets: asyncHandler(async (req, res) => res.json({ success: true, data: await BudgetModel.list(req.db) })),
  saveBudget: asyncHandler(async (req, res) => {
    if (req.body.category !== OVERALL) await CategoryModel.assertValid(req.db, 'expense', req.body.category);
    res.json({ success: true, data: await BudgetModel.upsert(req.db, req.user.id, req.body) });
  }),
  removeBudget: asyncHandler(async (req, res) => {
    const c = String(req.params.category || '').toLowerCase().slice(0, 30);
    if (!c) throw new AppError('Category is required.', 400);
    await BudgetModel.remove(req.db, c);
    res.json({ success: true, data: { deleted: true } });
  }),
};
