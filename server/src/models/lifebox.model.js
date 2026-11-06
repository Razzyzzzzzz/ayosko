import { makeModel } from './baseModel.js';
import { AppError } from '../utils/AppError.js';

export const LifeReminderModel = makeModel('life_reminders', { orderBy: 'due_on', ascending: true, searchColumn: 'title' });
export const LifeEventModel = makeModel('life_events', { orderBy: 'event_date', ascending: false, searchColumn: 'title' });

export const EmergencyModel = {
  async get(db, userId) {
    const { data, error } = await db.from('emergency_info').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async upsert(db, userId, input) {
    const { data, error } = await db.from('emergency_info').upsert({ ...input, user_id: userId }, { onConflict: 'user_id' }).select().single();
    if (error) throw new AppError(error.message, 400);
    return data;
  },
  async clear(db, userId) {
    const { error } = await db.from('emergency_info').delete().eq('user_id', userId);
    if (error) throw new AppError(error.message, 400);
  },
};
