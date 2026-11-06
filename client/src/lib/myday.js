// Turns raw task/bill/reminder/appointment rows into the "My Day" agenda. Pure functions, no imports.
const pad = (n) => String(n).padStart(2, '0');
export const localYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (s, n) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return localYmd(d); };
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const PRI = { high: 0, medium: 1, low: 2 };
const TYPE = { appointment: 0, reminder: 1, bill: 2, task: 3 };

export function buildAgenda({ tasks = [], bills = [], reminders = [], appointments = [], doneTasks = [] }, today) {
  const items = [];
  for (const t of tasks) items.push({ key: `task:${t.id}`, type: 'task', id: t.id, title: t.title, date: t.due_date, time: null, priority: t.priority, category: t.category, repeats: t.recurrence !== 'none' ? t.recurrence : null });
  for (const b of bills) items.push({ key: `bill:${b.id}`, type: 'bill', id: b.id, title: b.name, date: b.due_date, time: null, amount: Number(b.amount), repeats: b.recurrence !== 'none' ? b.recurrence : null });
  for (const r of reminders) { const d = new Date(r.remind_at); items.push({ key: `reminder:${r.id}`, type: 'reminder', id: r.id, title: r.title, date: localYmd(d), time: hhmm(d) }); }
  for (const a of appointments) { const d = new Date(a.starts_at); items.push({ key: `appointment:${a.id}`, type: 'appointment', id: a.id, title: a.title, date: localYmd(d), time: hhmm(d), location: a.location }); }

  const order = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '99:99').localeCompare(b.time || '99:99')
    || (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1) || TYPE[a.type] - TYPE[b.type] || a.title.localeCompare(b.title);
  items.sort(order);

  const weekEnd = addDays(today, 7);
  const overdue = items.filter((i) => i.date && i.date < today && i.type !== 'appointment');
  const todayItems = items.filter((i) => i.date === today);
  const unscheduled = items.filter((i) => !i.date);
  const upcomingMap = new Map();
  for (const i of items) if (i.date > today && i.date <= weekEnd) { if (!upcomingMap.has(i.date)) upcomingMap.set(i.date, []); upcomingMap.get(i.date).push(i); }
  const upcoming = [...upcomingMap].map(([date, list]) => ({ date, items: list }));
  const laterCount = items.filter((i) => i.date > weekEnd).length;

  const doneCount = doneTasks.filter((t) => t.completed_at && localYmd(new Date(t.completed_at)) === today).length;
  const toDo = overdue.length + todayItems.filter((i) => i.type !== 'appointment').length;
  const total = doneCount + toDo;
  return { overdue, today: todayItems, upcoming, unscheduled, laterCount, doneCount, toDo, progress: total ? Math.round((doneCount / total) * 100) : 0, upcomingCount: upcoming.reduce((n, g) => n + g.items.length, 0) };
}