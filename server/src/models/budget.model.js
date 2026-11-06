import { AppError } from '../utils/AppError.js';

export const BudgetModel = {
  async list(db) {
    const { data, error } = await db.from('budgets').select('*');
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async upsert(db, userId, { category, monthly_limit }) {
    const { data, error } = await db.from('budgets')
      .upsert({ user_id: userId, category, monthly_limit }, { onConflict: 'user_id,category' }).select().single();
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async remove(db, category) {
    const { error } = await db.from('budgets').delete().eq('category', category);
    if (error) throw new AppError(error.message, 400);
  },
};
