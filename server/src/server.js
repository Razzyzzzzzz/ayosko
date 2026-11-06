import { env } from './config/env.js';
import app from './app.js';
import { startScheduler } from './jobs/scheduler.js';

app.listen(env.port, () => {
  console.log(`AyosKo API running on http://localhost:${env.port}/api`);
  startScheduler();
});
