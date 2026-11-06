import { asyncHandler } from '../utils/asyncHandler.js';

const ok = (res, data, status = 200, meta) => res.status(status).json({ success: true, data, ...(meta && { meta }) });

// Builds list/get/create/update/remove handlers. `hooks` lets a resource add logic.
export const makeController = (Model, { filterKeys = [], hooks = {} } = {}) => ({
  list: asyncHandler(async (req, res) => {
    const { search, limit, offset, sort, dir } = req.query;
    const filters = Object.fromEntries(filterKeys.filter((k) => req.query[k] !== undefined).map((k) => {
      const v = req.query[k];
      return [k, v === 'true' ? true : v === 'false' ? false : v];
    }));
    const { rows, total } = await Model.list(req.db, {
      search, sort, dir, filters,
      limit: Math.min(Number(limit) || 100, 200), offset: Number(offset) || 0,
    });
    ok(res, rows, 200, { total });
  }),
  get: asyncHandler(async (req, res) => ok(res, await Model.get(req.db, req.params.id))),
  create: asyncHandler(async (req, res) => ok(res, await Model.create(req.db, req.user.id, req.body), 201)),
  update: asyncHandler(async (req, res) => {
    const before = hooks.beforeUpdate ? await Model.get(req.db, req.params.id) : null;
    const input = hooks.prepare ? hooks.prepare(req.body) : req.body;
    const row = await Model.update(req.db, req.params.id, input);
    if (hooks.afterUpdate) await hooks.afterUpdate(req, before, row);
    ok(res, row);
  }),
  remove: asyncHandler(async (req, res) => {
    if (hooks.beforeRemove) await hooks.beforeRemove(req);
    await Model.remove(req.db, req.params.id);
    ok(res, { deleted: true });
  }),
});
