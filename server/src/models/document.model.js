import { makeModel } from './baseModel.js';
export const DocumentModel = makeModel('documents', { orderBy: 'expires_on', ascending: true, searchColumn: 'name' });
