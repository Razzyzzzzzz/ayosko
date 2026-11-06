import { AppError } from '../utils/AppError.js';

const one = (res) => { if (res.error) throw new AppError(res.error.message, 400); return res.data; };

export const ProfileModel = {
  get: async (db, userId) => one(await db.from('profiles').select('*').eq('id', userId).maybeSingle()),
  update: async (db, userId, input) => one(await db.from('profiles').update(input).eq('id', userId).select().single()),
  getPrefs: async (db, userId) => one(await db.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle()),
  updatePrefs: async (db, userId, input) => one(await db.from('notification_preferences').update(input).eq('user_id', userId).select().single()),
};
