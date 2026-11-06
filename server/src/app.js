import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();


app.set('trust proxy', 1);

app.use(helmet());


app.use(cors({
  origin: (origin, cb) => cb(null, !origin || env.clientOrigins.includes(origin)),
}));


app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
// AI costs money: stricter limits
app.use('/api/inbox/parse', rateLimit({ windowMs: 60_000, limit: 15 }));
app.use('/api/assistant', rateLimit({ windowMs: 60_000, limit: 10 }));

app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

export default app;