import { TransactionModel } from '../models/transaction.model.js';
import { CategoryModel } from '../models/category.model.js';
import { syncBudgetAlerts } from '../services/budgetAlerts.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const ok = (res, data, status = 200, meta) => res.status(status).json({ success: true, data, ...(meta && { meta }) });

const filtersFrom = (q) => ({
  type: ['income', 'expense'].includes(q.type) ? q.type : undefined,
  category: q.category ? String(q.category).toLowerCase().slice(0, 30) : undefined,
  from: isDate(q.from) ? q.from : undefined,
  to: isDate(q.to) ? q.to : undefined,
  search: q.search ? String(q.search).slice(0, 100) : undefined,
});

// Budget alerts must never block saving a transaction.
async function alertsFor(req, tx) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (tx.type === 'expense' && tx.spent_on.slice(0, 7) === thisMonth) {
    try { await syncBudgetAlerts(req.db, req.user.id, thisMonth); } catch (e) { console.error('[budget alerts]', e.message); }
  }
}

export const transactionController = {
  list: asyncHandler(async (req, res) => {
    const f = filtersFrom(req.query);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [{ rows, total }, sums] = await Promise.all([
      TransactionModel.list(req.db, f, { sort: req.query.sort, dir: req.query.dir, limit, offset }),
      TransactionModel.totals(req.db, f),
    ]);
    ok(res, rows, 200, { total, ...sums });
  }),
  get: asyncHandler(async (req, res) => ok(res, await TransactionModel.get(req.db, req.params.id))),
  create: asyncHandler(async (req, res) => {
    await CategoryModel.assertValid(req.db, req.body.type, req.body.category);
    const tx = await TransactionModel.create(req.db, req.user.id, req.body);
    await alertsFor(req, tx);
    ok(res, tx, 201);
  }),
  update: asyncHandler(async (req, res) => {
    const before = await TransactionModel.get(req.db, req.params.id);
    const merged = { ...before, ...req.body };
    await CategoryModel.assertValid(req.db, merged.type, merged.category);
    const tx = await TransactionModel.update(req.db, req.params.id, req.body);
    await alertsFor(req, tx);
    ok(res, tx);
  }),
  remove: asyncHandler(async (req, res) => { await TransactionModel.remove(req.db, req.params.id); ok(res, { deleted: true }); }),
};
