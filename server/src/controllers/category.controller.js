import { CategoryModel } from '../models/category.model.js';
import { defaultsFor, DEFAULT_COLORS } from '../utils/categories.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const categoryController = {
  // Defaults + the user's custom categories, grouped by type.
  list: asyncHandler(async (req, res) => {
    const custom = await CategoryModel.list(req.db);
    const build = (type) => [
      ...defaultsFor(type).map((name) => ({ name, color: DEFAULT_COLORS[name], custom: false })),
      ...custom.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name, color: c.color, custom: true })),
    ];
    res.json({ success: true, data: { expense: build('expense'), income: build('income') } });
  }),
  create: asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await CategoryModel.create(req.db, req.user.id, req.body) })),
  remove: asyncHandler(async (req, res) => { await CategoryModel.remove(req.db, req.params.id); res.json({ success: true, data: { deleted: true } }); }),
};
