import cron from 'node-cron';
import { generateAllNotifications } from '../services/notification.service.js';

// In-app notifications only. No push/email/SMS is sent; users see these when they open the app.
export function startScheduler() {
  generateAllNotifications();
  cron.schedule('0 * * * *', generateAllNotifications);
  console.log('Scheduler started (hourly in-app notification generation).');
}
