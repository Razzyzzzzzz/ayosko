import { askAssistant } from '../services/assistant.service.js';
import { ProfileModel } from '../models/profile.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const assistantController = {
  // Read-only: sumasagot lang batay sa data ng user (req.db ay sakop ng RLS). Walang sine-save.
  chat: asyncHandler(async (req, res) => {
    const { messages } = req.body;
    if (messages[messages.length - 1].role !== 'user') throw new AppError('The last message must be from the user.', 400);
    const profile = await ProfileModel.get(req.db, req.user.id).catch(() => null);
    const reply = await askAssistant(messages, { db: req.db, timezone: profile?.timezone });
    res.json({ success: true, data: { reply } });
  }),
};