import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { crudRouter } from './crud.router.js';
import documentRoutes from './document.routes.js';
import lifeboxRoutes from './lifebox.routes.js';
import * as S from '../validators/schemas.js';
import { taskController } from '../controllers/task.controller.js';
import { reminderController } from '../controllers/reminder.controller.js';
import { billController } from '../controllers/bill.controller.js';
import { appointmentController } from '../controllers/appointment.controller.js';
import { profileController } from '../controllers/profile.controller.js';
import { notificationController } from '../controllers/notification.controller.js';
import { inboxController } from '../controllers/inbox.controller.js';
import { assistantController } from '../controllers/assistant.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { transactionController } from '../controllers/transaction.controller.js';
import { categoryController } from '../controllers/category.controller.js';
import { financeController } from '../controllers/finance.controller.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

api.use(auth); // everything below requires a verified Supabase session

api.get('/dashboard', dashboardController.get);

api.use('/tasks', crudRouter(taskController, S.taskSchema, S.patchOf(S.taskSchema)));
api.use('/reminders', crudRouter(reminderController, S.reminderSchema, S.patchOf(S.reminderSchema)));
api.use('/bills', crudRouter(billController, S.billSchema, S.patchOf(S.billSchema)));
api.use('/appointments', crudRouter(appointmentController, S.appointmentSchema, S.patchOf(S.appointmentSchema)));
api.use('/documents', documentRoutes);
api.use('/lifebox', lifeboxRoutes);

api.use('/transactions', crudRouter(transactionController, S.transactionSchema, S.patchOf(S.transactionSchema)));

api.get('/categories', categoryController.list);
api.post('/categories', validate(S.categorySchema), categoryController.create);
api.delete('/categories/:id', validate(S.idParam, 'params'), categoryController.remove);

api.get('/finance/summary', financeController.summary);
api.get('/budgets', financeController.listBudgets);
api.put('/budgets', validate(S.budgetSchema), financeController.saveBudget);
api.delete('/budgets/:category', financeController.removeBudget);

api.get('/profile', profileController.get);
api.patch('/profile', validate(S.profileSchema), profileController.update);
api.patch('/profile/preferences', validate(S.prefsSchema), profileController.updatePrefs);

api.get('/notifications', notificationController.list);
api.patch('/notifications/read-all', notificationController.readAll);
api.patch('/notifications/:id/read', validate(S.idParam, 'params'), notificationController.read);

api.get('/inbox/status', inboxController.status);
api.post('/inbox/parse', validate(S.inboxSchema), inboxController.parse);

api.post('/assistant/chat', validate(S.assistantSchema), assistantController.chat);

export default api;