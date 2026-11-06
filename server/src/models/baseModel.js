import { AppError } from '../utils/AppError.js';

// Generic data access for user-owned tables. `db` is the RLS-enforced client.
export const makeModel = (table, { orderBy = 'created_at', ascending = false, searchColumn } = {}) => ({
  async list(db, { search, limit = 100, offset = 0, sort, dir, filters = {} } = {}) {
    let q = db.from(table).select('*', { count: 'exact' });
    for (const [k, v] of Object.entries(filters)) if (v !== undefined) q = q.eq(k, v);
    if (search && searchColumn) q = q.ilike(searchColumn, `%${search.replace(/[%,]/g, '')}%`);
    q = q.order(sort || orderBy, { ascending: dir ? dir === 'asc' : ascending })
         .range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) throw new AppError(error.message, 400);
    return { rows: data, total: count };
  },
  async get(db, id) {
    const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError('Record not found.', 404);
    return data;
  },
  async create(db, userId, input) {
    const { data, error } = await db.from(table).insert({ ...input, user_id: userId }).select().single();
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async update(db, id, input) {
    const { data, error } = await db.from(table).update(input).eq('id', id).select().maybeSingle();
    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError('Record not found.', 404);
    return data;
  },
  async remove(db, id) {
    const { data, error } = await db.from(table).delete().eq('id', id).select().maybeSingle();
    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError('Record not found.', 404);
    return data;
  },
});
