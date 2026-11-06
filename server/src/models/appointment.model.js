import { makeModel } from './baseModel.js';
export const AppointmentModel = makeModel('appointments', { orderBy: 'starts_at', ascending: true, searchColumn: 'title' });
