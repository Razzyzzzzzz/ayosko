import multer from 'multer';
import { AppError } from './AppError.js';

// multer wrapper that turns its errors (file too big, wrong field) into clean 4xx responses.
export const singleUpload = (field, maxBytes) => {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(field);
  return (req, res, next) => upload(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    next(new AppError(tooBig ? `That file is too large (limit ${Math.round(maxBytes / 1048576)} MB).` : 'Upload failed. Send the file as multipart form data.', tooBig ? 413 : 400));
  });
};
