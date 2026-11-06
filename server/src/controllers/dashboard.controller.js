import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ProfileModel } from '../models/profile.model.js';

// "Ngayon" ayon sa timezone ng user (hindi UTC), para tama ang petsa sa Pilipinas
function localDate(date, tz) {
  try { return date.toLocaleDateString('en-CA', { timeZone: tz }); } catch { return date.toISOString().slice(0, 10); }
}

export const dashboardController = {
  get: asyncHandler(async (req, res) => {
    const db = req.db;
    const profile = await ProfileModel.get(db, req.user.id).catch(() => null);
    const tz = profile?.timezone || 'Asia/Manila';

    const now = new Date();
    const today = localDate(now, tz);
    const weekStr = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10);
    const week = new Date(now.getTime() + 7 * 864e5);

    const [open, done, deadlines, overdueTasks, reminders, appts, bills, overdue, unread] = await Promise.all([
      db.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false),
      db.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', true),
      // Susunod na 7 araw lang: mula ngayon hanggang weekStr (wala nang lipas na)
      db.from('tasks').select('*').eq('completed', false).not('due_date', 'is', null).gte('due_date', today).lte('due_date', weekStr).order('due_date').limit(10),
      // Lipas na ang due date at hindi pa tapos
      db.from('tasks').select('*', { count: 'exact' }).eq('completed', false).not('due_date', 'is', null).lt('due_date', today).order('due_date').limit(5),
      db.from('reminders').select('*').eq('done', false).gte('remind_at', now.toISOString()).order('remind_at').limit(10),
      db.from('appointments').select('*').gte('starts_at', now.toISOString()).lte('starts_at', week.toISOString()).order('starts_at').limit(10),
      db.from('bills').select('*').eq('status', 'unpaid').gte('due_date', today).lte('due_date', weekStr).order('due_date').limit(10),
      db.from('bills').select('*').eq('status', 'unpaid').lt('due_date', today).order('due_date').limit(10),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    ]);
    const failed = [open, done, deadlines, overdueTasks, reminders, appts, bills, overdue, unread].find((r) => r.error);
    if (failed) throw new AppError(failed.error.message, 400);

    res.json({ success: true, data: {
      date: today,
      stats: { open_tasks: open.count, completed_tasks: done.count, unread_notifications: unread.count, overdue_tasks: overdueTasks.count },
      upcoming_deadlines: deadlines.data, overdue_tasks: overdueTasks.data, pending_reminders: reminders.data,
      upcoming_appointments: appts.data, bills_due_soon: bills.data, overdue_bills: overdue.data,
    } });
  }),
};