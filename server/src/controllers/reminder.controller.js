import { ReminderModel } from '../models/reminder.model.js';
import { makeController } from './crud.controller.js';
export const reminderController = makeController(ReminderModel, { filterKeys: ['done'] });
