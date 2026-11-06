import { crudRouter } from './crud.router.js';
import { documentController as ctrl } from '../controllers/document.controller.js';
import { patchOf, idParam } from '../validators/schemas.js';
import { lifeboxDocumentSchema } from '../validators/lifeboxSchemas.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../utils/upload.js';

const router = crudRouter(ctrl, lifeboxDocumentSchema, patchOf(lifeboxDocumentSchema));
router.post('/:id/file', validate(idParam, 'params'), singleUpload('file', 10 * 1048576), ctrl.upload);
router.get('/:id/file', validate(idParam, 'params'), ctrl.fileUrl);
export default router;