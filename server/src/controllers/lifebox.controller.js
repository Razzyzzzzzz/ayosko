import { randomUUID } from 'node:crypto';
import { LifeReminderModel, LifeEventModel, EmergencyModel } from '../models/lifebox.model.js';
import { makeController } from './crud.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sniffMime } from '../utils/fileType.js';
import { STORAGE_BUCKET } from '../utils/lifeboxConstants.js';

export const reminderController = makeController(LifeReminderModel, { filterKeys: ['category'] });

const signUrls = async (db, paths) => {
  const map = {};
  if (!paths.length) return map;
  const { data } = await db.storage.from(STORAGE_BUCKET).createSignedUrls(paths, 3600);
  for (const d of data ?? []) if (d.signedUrl) map[d.path] = d.signedUrl;
  return map;
};

const eventBase = makeController(LifeEventModel, {
  hooks: { async beforeRemove(req) { const ev = await LifeEventModel.get(req.db, req.params.id); if (ev.photo_path) await req.db.storage.from(STORAGE_BUCKET).remove([ev.photo_path]); } },
});
export const eventController = {
  ...eventBase,
  // Timeline list with short-lived signed photo links (the bucket is private).
  list: asyncHandler(async (req, res) => {
    const { rows, total } = await LifeEventModel.list(req.db, { limit: 200, sort: 'event_date', dir: 'desc' });
    const urls = await signUrls(req.db, rows.map((r) => r.photo_path).filter(Boolean));
    res.json({ success: true, data: rows.map((r) => ({ ...r, photo_url: r.photo_path ? urls[r.photo_path] ?? null : null })), meta: { total } });
  }),
};

export const lifeboxController = {
  getEmergency: asyncHandler(async (req, res) => res.json({ success: true, data: await EmergencyModel.get(req.db, req.user.id) })),
  saveEmergency: asyncHandler(async (req, res) => res.json({ success: true, data: await EmergencyModel.upsert(req.db, req.user.id, req.body) })),
  clearEmergency: asyncHandler(async (req, res) => { await EmergencyModel.clear(req.db, req.user.id); res.json({ success: true, data: { deleted: true } }); }),

  uploadEventPhoto: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No photo uploaded.', 400);
    const real = sniffMime(req.file.buffer);
    if (!real || !real.startsWith('image/')) throw new AppError('Photos must be JPG, PNG, or WEBP.', 415);
    const ev = await LifeEventModel.get(req.db, req.params.id); // RLS: 404 unless it's yours
    const safe = req.file.originalname.replace(/[^\w.\-]+/g, '_').slice(-60);
    const path = `${req.user.id}/timeline/${randomUUID()}-${safe}`;
    const { error } = await req.db.storage.from(STORAGE_BUCKET).upload(path, req.file.buffer, { contentType: real });
    if (error) throw new AppError(error.message, 400);
    if (ev.photo_path) await req.db.storage.from(STORAGE_BUCKET).remove([ev.photo_path]);
    const row = await LifeEventModel.update(req.db, ev.id, { photo_path: path, photo_size: req.file.size });
    const urls = await signUrls(req.db, [path]);
    res.json({ success: true, data: { ...row, photo_url: urls[path] ?? null } });
  }),
};
