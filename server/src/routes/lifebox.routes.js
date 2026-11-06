import { Router } from 'express';
import { crudRouter } from './crud.router.js';
import { validate } from '../middleware/validate.js';
import { idParam, patchOf } from '../validators/schemas.js';
import { reminderSchema, eventSchema, emergencySchema } from '../validators/lifeboxSchemas.js';
import { lifeboxController as c, reminderController, eventController } from '../controllers/lifebox.controller.js';
import { singleUpload } from '../utils/upload.js';

// Mounted at /api/lifebox (auth is applied once in routes/index.js). Documents themselves reuse /api/documents.
const r = Router();
r.get('/emergency', c.getEmergency);
r.put('/emergency', validate(emergencySchema), c.saveEmergency);
r.delete('/emergency', c.clearEmergency);
r.use('/reminders', crudRouter(reminderController, reminderSchema, patchOf(reminderSchema)));
r.post('/events/:id/photo', validate(idParam, 'params'), singleUpload('photo', 5 * 1048576), c.uploadEventPhoto);
r.use('/events', crudRouter(eventController, eventSchema, patchOf(eventSchema)));
export default r;
