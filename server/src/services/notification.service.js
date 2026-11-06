import { adminClient } from '../config/supabase.js';
import { TransactionModel } from '../models/transaction.model.js';
import { budgetStatuses, alertRows, monthRange } from './budgetAlerts.js';

const addDays = (n) => new Date(Date.now() + n * 864e5);
const ymd = (d) => d.toISOString().slice(0, 10);

async function insert(rows) {
  if (!rows.length) return;
  // unique(user_id, dedupe_key) makes this idempotent across cron runs
  const { error } = await adminClient.from('notifications').upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
  if (error) console.error('[notifications]', error.message);
}

async function forUser(prefs) {
  const uid = prefs.user_id;
  const today = ymd(new Date());
  const lead = ymd(addDays(prefs.lead_days));
  const rows = [];
  const n = (type, ref, key, title, body) => rows.push({ user_id: uid, type, ref_id: ref, dedupe_key: key, title, body });

  if (prefs.tasks) {
    const { data } = await adminClient.from('tasks').select('id,title,due_date').eq('user_id', uid)
      .eq('completed', false).not('due_date', 'is', null).lte('due_date', lead);
    for (const t of data ?? []) {
      const overdue = t.due_date < today;
      n('task', t.id, `task:${t.id}:${t.due_date}:${overdue ? 'o' : 's'}`,
        overdue ? `Overdue: ${t.title}` : `Task due soon: ${t.title}`, `Due ${t.due_date}`);
    }
  }
  if (prefs.bills) {
    const { data } = await adminClient.from('bills').select('id,name,amount,due_date').eq('user_id', uid)
      .eq('status', 'unpaid').lte('due_date', lead);
    for (const b of data ?? []) {
      const overdue = b.due_date < today;
      n('bill', b.id, `bill:${b.id}:${b.due_date}:${overdue ? 'o' : 's'}`,
        overdue ? `Overdue bill: ${b.name}` : `Bill due soon: ${b.name}`, `₱${b.amount} due ${b.due_date}`);
    }
  }
  if (prefs.appointments) {
    const { data } = await adminClient.from('appointments').select('id,title,starts_at').eq('user_id', uid)
      .gte('starts_at', new Date().toISOString()).lte('starts_at', addDays(prefs.lead_days).toISOString());
    for (const a of data ?? []) n('appointment', a.id, `appt:${a.id}:${a.starts_at}`, `Upcoming: ${a.title}`, a.starts_at);
  }
  if (prefs.documents) {
    const { data } = await adminClient.from('documents').select('id,name,expires_on,renewal_remind_days').eq('user_id', uid)
      .not('expires_on', 'is', null);
    for (const d of data ?? []) {
      if (d.expires_on <= ymd(addDays(d.renewal_remind_days)))
        n('document', d.id, `doc:${d.id}:${d.expires_on}`,
          d.expires_on < today ? `Expired: ${d.name}` : `Renew soon: ${d.name}`, `Expires ${d.expires_on}`);
    }
  }
  if (prefs.documents) {
    const { data } = await adminClient.from('life_reminders').select('id,title,due_on,remind_days').eq('user_id', uid).lte('due_on', ymd(addDays(365)));
    for (const r of data ?? []) {
      if (r.due_on <= ymd(addDays(r.remind_days))) {
        const late = r.due_on < today;
        n('document', r.id, `lbr:${r.id}:${r.due_on}:${late ? 'o' : 's'}`, late ? `Overdue: ${r.title}` : `Coming up: ${r.title}`, `Due ${r.due_on}`);
      }
    }
  }
  if (prefs.budgets !== false) {
    const month = today.slice(0, 7); const [start, end] = monthRange(month);
    const [{ data: budgets }, expenses] = await Promise.all([
      adminClient.from('budgets').select('*').eq('user_id', uid),
      TransactionModel.fetchRange(adminClient, start, end, { type: 'expense', userId: uid }),
    ]);
    rows.push(...alertRows(uid, month, budgetStatuses(expenses, budgets ?? [])));
  }
  await insert(rows);
}

export async function generateAllNotifications() {
  const { data, error } = await adminClient.from('notification_preferences').select('*');
  if (error) return console.error('[notifications]', error.message);
  for (const prefs of data) await forUser(prefs).catch((e) => console.error('[notifications]', e.message));
}