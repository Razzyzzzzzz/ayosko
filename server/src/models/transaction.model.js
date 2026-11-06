import { AppError } from '../utils/AppError.js';

const SORTS = ['spent_on', 'amount', 'category', 'created_at'];
const clean = (s) => String(s).replace(/[%,()*\\]/g, '').trim();
const fail = (error) => { throw new AppError(error.message, 400); };

// Shared filter set for history, totals and range queries.
function apply(q, f = {}) {
  if (f.type) q = q.eq('type', f.type);
  if (f.category) q = q.eq('category', f.category);
  if (f.from) q = q.gte('spent_on', f.from);
  if (f.to) q = q.lte('spent_on', f.to);
  const s = f.search ? clean(f.search) : '';
  if (s) q = q.or(`description.ilike.%${s}%,category.ilike.%${s}%`);
  return q;
}

export const TransactionModel = {
  async list(db, f, { sort, dir, limit = 50, offset = 0 } = {}) {
    const col = SORTS.includes(sort) ? sort : 'spent_on';
    const { data, error, count } = await apply(db.from('transactions').select('*', { count: 'exact' }), f)
      .order(col, { ascending: dir === 'asc' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) fail(error);
    return { rows: data, total: count };
  },
  // Income/expense sums for the same filters (pages through Supabase's 1000-row cap).
  async totals(db, f) {
    let income = 0, expense = 0;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await apply(db.from('transactions').select('type,amount'), f).order('id').range(from, from + 999);
      if (error) fail(error);
      for (const r of data) (r.type === 'income' ? (income += Number(r.amount)) : (expense += Number(r.amount)));
      if (data.length < 1000) break;
    }
    return { income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100 };
  },
  async fetchRange(db, start, end, { type, userId } = {}) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = db.from('transactions').select('id,type,amount,category,description,spent_on').gte('spent_on', start).lte('spent_on', end);
      if (type) q = q.eq('type', type);
      if (userId) q = q.eq('user_id', userId); // service-role callers must scope to one user
      const { data, error } = await q.order('spent_on').order('id').range(from, from + 999);
      if (error) fail(error);
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  },
  async get(db, id) {
    const { data, error } = await db.from('transactions').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Transaction not found.', 404);
    return data;
  },
  async create(db, userId, input) {
    const { data, error } = await db.from('transactions').insert({ ...input, user_id: userId }).select().single();
    if (error) fail(error);
    return data;
  },
  async update(db, id, input) {
    const { data, error } = await db.from('transactions').update(input).eq('id', id).select().maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Transaction not found.', 404);
    return data;
  },
  async remove(db, id) {
    const { data, error } = await db.from('transactions').delete().eq('id', id).select().maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Transaction not found.', 404);
  },
};
