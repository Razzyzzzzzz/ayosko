import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/schemas.js';

// route → validate → controller (auth is applied once in routes/index.js)
export const crudRouter = (ctrl, createSchema, patchSchema) => {
  const r = Router();
  r.get('/', ctrl.list);
  r.post('/', validate(createSchema), ctrl.create);
  r.get('/:id', validate(idParam, 'params'), ctrl.get);
  r.patch('/:id', validate(idParam, 'params'), validate(patchSchema), ctrl.update);
  r.delete('/:id', validate(idParam, 'params'), ctrl.remove);
  return r;
};
