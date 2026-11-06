import { randomUUID } from 'node:crypto';
import { DocumentModel } from '../models/document.model.js';
import { makeController } from './crud.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sniffMime } from '../utils/fileType.js';

const BUCKET = 'documents';

const base = makeController(DocumentModel, {
  hooks: {
    async beforeRemove(req) {
      const doc = await DocumentModel.get(req.db, req.params.id);
      if (doc.file_path) await req.db.storage.from(BUCKET).remove([doc.file_path]);
    },
  },
});

export const documentController = {
  ...base,

  // multipart field name: "file". Stored at <user_id>/<uuid>-<name>; storage RLS enforces the folder.
  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded.', 400);
    const realType = sniffMime(req.file.buffer); // trust the file's bytes, not the browser's claim
    if (!realType) throw new AppError('Only PDF, JPG, PNG, or WEBP files are allowed.', 415);

    const doc = await DocumentModel.get(req.db, req.params.id);
    const safe = req.file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80);
    const path = `${req.user.id}/${randomUUID()}-${safe}`;

    const { error } = await req.db.storage.from(BUCKET).upload(path, req.file.buffer, { contentType: realType });
    if (error) throw new AppError(error.message, 400);
    if (doc.file_path) await req.db.storage.from(BUCKET).remove([doc.file_path]);

    const meta = { file_path: path, file_name: req.file.originalname };
    let row;
    try { row = await DocumentModel.update(req.db, doc.id, { ...meta, file_size: req.file.size }); }
    catch (e) { if (!/file_size/.test(e.message)) throw e; row = await DocumentModel.update(req.db, doc.id, meta); } // SQL 006 not run yet
    res.json({ success: true, data: row });
  }),

  // Short-lived signed URL; the bucket is private.
  fileUrl: asyncHandler(async (req, res) => {
    const doc = await DocumentModel.get(req.db, req.params.id);
    if (!doc.file_path) throw new AppError('No file attached.', 404);
    const { data, error } = await req.db.storage.from(BUCKET).createSignedUrl(doc.file_path, 60);
    if (error) throw new AppError(error.message, 400);
    res.json({ success: true, data: { url: data.signedUrl, expires_in: 60 } });
  }),
};