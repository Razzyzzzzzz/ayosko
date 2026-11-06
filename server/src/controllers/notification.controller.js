import { NotificationModel } from '../models/notification.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationController = {
  list: asyncHandler(async (req, res) =>
    res.json({ success: true, data: await NotificationModel.list(req.db, { unreadOnly: req.query.unread === 'true' }) })),
  read: asyncHandler(async (req, res) => {
    await NotificationModel.markRead(req.db, req.params.id);
    res.json({ success: true, data: { read: true } });
  }),
  readAll: asyncHandler(async (req, res) => {
    await NotificationModel.markAllRead(req.db);
    res.json({ success: true, data: { read: true } });
  }),
};
