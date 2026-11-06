import { ProfileModel } from '../models/profile.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const profileController = {
  get: asyncHandler(async (req, res) => {
    const [profile, preferences] = await Promise.all([
      ProfileModel.get(req.db, req.user.id), ProfileModel.getPrefs(req.db, req.user.id),
    ]);
    res.json({ success: true, data: { ...profile, email: req.user.email, preferences } });
  }),
  update: asyncHandler(async (req, res) =>
    res.json({ success: true, data: await ProfileModel.update(req.db, req.user.id, req.body) })),
  updatePrefs: asyncHandler(async (req, res) =>
    res.json({ success: true, data: await ProfileModel.updatePrefs(req.db, req.user.id, req.body) })),
};
