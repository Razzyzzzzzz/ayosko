import { makeModel } from './baseModel.js';
export const TaskModel = makeModel('tasks', { orderBy: 'due_date', ascending: true, searchColumn: 'title' });
