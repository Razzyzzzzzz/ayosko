import { AppError } from '../utils/AppError.js';
import { defaultsFor, FALLBACK_COLOR } from '../utils/categories.js';

const TYPES = ['income', 'expense'];
const fail = (error) => { throw new AppError(error.message, 400); };
const norm = (s) => String(s ?? '').trim().toLowerCase();

// Custom categories live in the `categories` table (RLS: owner only).
export const CategoryModel = {
  // The user's custom categories (plain array).
  async list(db) {
    const { data, error } = await db.from('categories').select('*').order('name');
    if (error) fail(error);
    return data ?? [];
  },

  async create(db, userId, input) {
    const type = input?.type;
    const name = norm(input?.name).slice(0, 30);
    if (!TYPES.includes(type)) throw new AppError('Type must be income or expense.', 400);
    if (!name) throw new AppError('Category name is required.', 400);
    if (defaultsFor(type).includes(name)) throw new AppError('That is already a built-in category.', 409);
    const { data, error } = await db
      .from('categories')
      .insert({ user_id: userId, type, name, color: input?.color || FALLBACK_COLOR })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('You already have that category.', 409);
      fail(error);
    }
    return data;
  },

  async remove(db, id) {
    const { data, error } = await db.from('categories').delete().eq('id', id).select().maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError('Category not found.', 404);
    return data;
  },

  // Allowed = built-in for that type, or one of the user's custom ones.
  // Signature matches transaction.controller.js: assertValid(db, type, category)
  async assertValid(db, type, category) {
    if (!TYPES.includes(type)) throw new AppError('Type must be income or expense.', 400);
    const name = norm(category);
    if (!name) throw new AppError('Category is required.', 400);
    if (defaultsFor(type).includes(name)) return name;
    const { data, error } = await db.from('categories').select('id').eq('type', type).eq('name', name).maybeSingle();
    if (error) fail(error);
    if (!data) throw new AppError(`Unknown ${type} category "${category}".`, 400);
    return name;
  },
};