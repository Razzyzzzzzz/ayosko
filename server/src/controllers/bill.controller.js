import { BillModel } from '../models/bill.model.js';
import { makeController } from './crud.controller.js';
import { nextDate } from '../services/recurrence.js';

export const billController = makeController(BillModel, {
  filterKeys: ['status'],
  hooks: {
    beforeUpdate: true,
    prepare: (b) => (b.status === undefined ? b : { ...b, paid_at: b.status === 'paid' ? new Date().toISOString() : null }),
    // Paying a recurring bill creates next period's bill.
    async afterUpdate(req, before, row) {
      if (before.status !== 'paid' && row.status === 'paid' && row.recurrence !== 'none') {
        const { id, created_at, updated_at, paid_at, ...rest } = row;
        await BillModel.create(req.db, req.user.id, { ...rest, status: 'unpaid', due_date: nextDate(row.due_date, row.recurrence) });
      }
    },
  },
});
