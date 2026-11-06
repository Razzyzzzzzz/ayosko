// Next occurrence of a YYYY-MM-DD date for a recurrence rule (UTC math, no TZ drift).
export function nextDate(dateStr, recurrence) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDate();
  switch (recurrence) {
    case 'daily': d.setUTCDate(day + 1); break;
    case 'weekly': d.setUTCDate(day + 7); break;
    case 'monthly': {
      d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, last)); break;
    }
    case 'yearly': d.setUTCFullYear(d.getUTCFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().slice(0, 10);
}
