import { makeModel } from './baseModel.js';
export const ReminderModel = makeModel('reminders', { orderBy: 'remind_at', ascending: true, searchColumn: 'title' });
