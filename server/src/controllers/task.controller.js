import { TaskModel } from '../models/task.model.js';
import { makeController } from './crud.controller.js';
import { nextDate } from '../services/recurrence.js';

export const taskController = makeController(TaskModel, {
  filterKeys: ['completed', 'priority', 'category'],
  hooks: {
    beforeUpdate: true,
    prepare: (b) => (b.completed === undefined ? b : { ...b, completed_at: b.completed ? new Date().toISOString() : null }),
    // Completing a recurring task spawns the next occurrence.
    async afterUpdate(req, before, row) {
      if (!before.completed && row.completed && row.recurrence !== 'none' && row.due_date) {
        const { id, created_at, updated_at, completed_at, ...rest } = row;
        await TaskModel.create(req.db, req.user.id, { ...rest, completed: false, due_date: nextDate(row.due_date, row.recurrence) });
      }
    },
  },
});
