// LifeBox helpers. Self-contained: no dependency on other app modules.
const pad = (n) => String(n).padStart(2, '0');
export const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

export const DOC_CATEGORIES = [
  { key: 'ids', label: 'Valid IDs', chip: 'IDs', single: 'Valid ID', color: '#f59e0b' },
  { key: 'personal', label: 'Personal Documents', chip: 'Personal', single: 'Personal Document', color: '#f97316' },
  { key: 'school', label: 'School Records', chip: 'School', single: 'School Record', color: '#10b981' },
  { key: 'employment', label: 'Employment', chip: 'Work', single: 'Employment Document', color: '#3b82f6' },
  { key: 'certificates', label: 'Certificates', chip: 'Certificates', single: 'Certificate', color: '#eab308' },
  { key: 'receipts', label: 'Receipts', chip: 'Receipts', single: 'Receipt', color: '#22c55e' },
  { key: 'warranties', label: 'Warranties', chip: 'Warranties', single: 'Warranty', color: '#8b5cf6' },
  { key: 'other', label: 'Other Documents', chip: 'Other', single: 'Document', color: '#64748b' },
];
export const catOf = (k) => DOC_CATEGORIES.find((c) => c.key === k) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1];
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
export const REMIND_OPTIONS = [[0, 'On the day'], [1, '1 day before'], [3, '3 days before'], [7, '7 days before'], [14, '14 days before'], [30, '30 days before'], [60, '60 days before'], [90, '90 days before']];

// state: none | valid | soon | expired.  verb: 'Expires' for documents, 'Due' for reminders.
export function expiryStatus(date, remindDays = 30, today = todayLocal(), verb = 'Expires') {
  if (!date) return { state: 'none', days: null, label: 'No expiry' };
  const days = daysBetween(today, date);
  const past = verb === 'Expires' ? 'Expired' : 'Overdue';
  if (days < 0) return { state: 'expired', days, label: `${past} ${days === -1 ? 'yesterday' : `${-days} days ago`}` };
  if (days === 0) return { state: 'soon', days, label: `${verb} today` };
  const label = `${verb} in ${days} day${days === 1 ? '' : 's'}`;
  return { state: days <= (remindDays ?? 30) ? 'soon' : 'valid', days, label };
}
export const STATE_STYLE = { expired: 'bg-red-100 text-red-700', soon: 'bg-amber-100 text-amber-800', valid: 'bg-emerald-100 text-emerald-700', none: 'bg-slate-100 text-slate-600' };
export const STATE_WORD = { expired: 'Expired', soon: 'Due soon', valid: 'Active', none: 'No expiry' };

// One list of everything with a date: document expiries + custom reminders.
export function dateItems(docs, reminders, today = todayLocal()) {
  const out = [];
  for (const d of docs) if (d.expires_on) out.push({ key: `d${d.id}`, kind: 'document', id: d.id, title: d.name, category: d.category, date: d.expires_on, remindDays: d.renewal_remind_days ?? 30, ...expiryStatus(d.expires_on, d.renewal_remind_days, today, 'Expires') });
  for (const r of reminders) out.push({ key: `r${r.id}`, kind: 'reminder', id: r.id, title: r.title, category: r.category, date: r.due_on, remindDays: r.remind_days, ...expiryStatus(r.due_on, r.remind_days, today, 'Due') });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export const mask = (v) => (!v ? '' : v.length <= 4 ? '••••' : `•••• ${v.slice(-4)}`);
export const telHref = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
export const fmtSize = (b) => (!b ? '' : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const extOf = (name = '') => (name.split('.').pop() || '').toLowerCase();
export const mimeOf = (name) => MIME[extOf(name)] ?? null;
export const fileKind = (name) => { const m = mimeOf(name); return m === 'application/pdf' ? 'pdf' : m ? 'image' : null; };

export const MAX_BYTES = 10 * 1024 * 1024; // matches the server limit
export const STORAGE_LIMIT_BYTES = 1024 * 1048576; // Supabase Free plan file storage (1 GB); change if your plan differs

export async function imageToJpeg(file, maxDim = 2200, quality = 0.85) {
  const bmp = await createImageBitmap(file); // respects EXIF rotation
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('compress failed');
  return { blob, width: w, height: h };
}

// Validates, and shrinks big photos so they upload quickly and fit the limit.
export async function prepareFile(file, { imagesOnly = false, limit = MAX_BYTES } = {}) {
  const kind = fileKind(file.name) ?? (file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : null);
  if (!kind || (imagesOnly && kind !== 'image')) throw new Error(imagesOnly ? 'Please choose a JPG, PNG, or WEBP photo.' : 'Only PDF, JPG, PNG, or WEBP files are allowed.');
  let out = file;
  if (kind === 'image' && file.size > 1.5 * 1048576) {
    try { const { blob } = await imageToJpeg(file); out = new File([blob], `${(file.name || 'photo').replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg' }); } catch { out = file; }
  }
  if (out.size > limit) throw new Error(`That file is ${fmtSize(out.size)}. The limit is ${Math.round(limit / 1048576)} MB.`);
  return out;
}

// 0-100: how much of the emergency card is filled in
export function emergencyCompleteness(e) {
  if (!e) return 0;
  const checks = [!!e.blood_type, !!e.allergies, !!e.conditions, !!e.medications, (e.contacts?.length ?? 0) > 0, !!e.doctor_name, !!(e.hmo_name || e.hmo_number)];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// The scanner shows the video with object-fit: cover; this maps the on-screen guide frame back to video pixels.
export function mapFrameToVideo({ cw, ch, vw, vh, fx, fy, fw, fh }) {
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (vw * scale - cw) / 2, oy = (vh * scale - ch) / 2;
  const sx = Math.max(0, (fx + ox) / scale), sy = Math.max(0, (fy + oy) / scale);
  return { sx, sy, sw: Math.min(vw - sx, fw / scale), sh: Math.min(vh - sy, fh / scale) };
}

export const maskNumbers = () => { try { return localStorage.getItem('lifebox.maskNumbers') !== '0'; } catch { return true; } };
export const setMaskNumbers = (v) => { try { localStorage.setItem('lifebox.maskNumbers', v ? '1' : '0'); } catch { /* private mode */ } };