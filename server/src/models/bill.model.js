import { makeModel } from './baseModel.js';
export const BillModel = makeModel('bills', { orderBy: 'due_date', ascending: true, searchColumn: 'name' });
