import { parseInbox } from '../services/inbox.service.js';
import { ProfileModel } from '../models/profile.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inboxController = {
  status: (_req, res) => res.json({ success: true, data: { mode: 'rules' } }),
  // Returns a SUGGESTION only. Nothing is saved until the client posts to /tasks, /bills, etc. after the user confirms.
  parse: asyncHandler(async (req, res) => {
    const profile = await ProfileModel.get(req.db, req.user.id);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: profile?.timezone || 'Asia/Manila' });
    res.json({ success: true, data: parseInbox(req.body.text, { today }) });
  }),
};