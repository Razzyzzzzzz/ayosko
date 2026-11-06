import { AppError } from '../utils/AppError.js';

export const NotificationModel = {
  async list(db, { unreadOnly = false, limit = 50 } = {}) {
    let q = db.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (unreadOnly) q = q.eq('read', false);
    const { data, error } = await q;
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async markRead(db, id) {
    const { error } = await db.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw new AppError(error.message, 400);
  },
  async markAllRead(db) {
    const { error } = await db.from('notifications').update({ read: true }).eq('read', false);
    if (error) throw new AppError(error.message, 400);
  },
};
