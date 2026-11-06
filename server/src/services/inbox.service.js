// Life Inbox parser: rule-based, no AI. Understands English, Filipino and Taglish.
// Rule: it never guesses a deadline. Unclear dates/times come back as null plus a warning.

const MONTHS = { jan: 1, january: 1, enero: 1, feb: 2, february: 2, pebrero: 2, mar: 3, march: 3, marso: 3, apr: 4, april: 4, abril: 4, may: 5, mayo: 5, jun: 6, june: 6, hunyo: 6, jul: 7, july: 7, hulyo: 7, aug: 8, august: 8, agosto: 8, sep: 9, sept: 9, september: 9, setyembre: 9, oct: 10, october: 10, oktubre: 10, nov: 11, november: 11, nobyembre: 11, dec: 12, december: 12, disyembre: 12 };
const WEEKDAYS = { sunday: 0, sun: 0, monday: 1, mon: 1, lunes: 1, tuesday: 2, tues: 2, tue: 2, martes: 2, wednesday: 3, wed: 3, miyerkules: 3, miyerkoles: 3, thursday: 4, thurs: 4, thur: 4, thu: 4, huwebes: 4, friday: 5, fri: 5, biyernes: 5, saturday: 6, sat: 6, sabado: 6 };
const alt = (o) => Object.keys(o).sort((a, b) => b.length - a.length).join('|');
const MONTH_RE = alt(MONTHS); const WD_RE = alt(WEEKDAYS);
const WORD_NUM = { a: 1, an: 1, one: 1, isang: 1, two: 2, dalawang: 2, three: 3, tatlong: 3 };
const SPANISH = { una: 1, dos: 2, tres: 3, kwatro: 4, singko: 5, sais: 6, siyete: 7, otso: 8, nuwebe: 9, diyes: 10, onse: 11, dose: 12 };
export const TASK_CATEGORIES = ['general', 'bills', 'work', 'school', 'personal', 'health', 'documents', 'errands'];

// ---------- date helpers (YYYY-MM-DD strings, UTC math, no timezone drift) ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const toStr = (d) => iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
const fromStr = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => { const d = fromStr(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const valid = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
const addMonths = (s, n) => { const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, Math.min(d, daysIn(t.getUTCFullYear(), t.getUTCMonth() + 1))); };
const mondayOf = (s) => addDays(s, -((fromStr(s).getUTCDay() + 6) % 7));

// First match whose handler returns a value is blanked out of the working text and returned.
function take(st, re, fn) {
  const g = new RegExp(re.source, 'gi'); let m;
  while ((m = g.exec(st.s))) {
    const r = fn(m);
    if (r !== undefined) { st.s = st.s.slice(0, m.index) + ' '.repeat(m[0].length) + st.s.slice(m.index + m[0].length); return r; }
    if (m[0].length === 0) g.lastIndex++;
  }
  return undefined;
}

function nextMonthDay(month, day, today, yearStr) {
  if (yearStr) { const y = yearStr.length === 2 ? 2000 + +yearStr : +yearStr; return valid(y, month, day) ? { date: iso(y, month, day), year: true } : undefined; }
  const ty = +today.slice(0, 4);
  for (let y = ty; y <= ty + 4; y++) if (valid(y, month, day) && iso(y, month, day) >= today) return { date: iso(y, month, day) };
  return undefined;
}
function nextDayOfMonth(day, today) {
  if (day < 1 || day > 31) return undefined;
  const [y, m] = today.split('-').map(Number);
  for (let i = 0; i < 14; i++) { const t = new Date(Date.UTC(y, m - 1 + i, 1)); const yy = t.getUTCFullYear(), mm = t.getUTCMonth() + 1; if (valid(yy, mm, day) && iso(yy, mm, day) >= today) return iso(yy, mm, day); }
  return undefined;
}

function parseDate(st, today) {
  let r;
  r = take(st, /\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => (valid(+m[1], +m[2], +m[3]) ? { date: iso(+m[1], +m[2], +m[3]), year: true } : undefined)); if (r) return r;
  r = take(st, new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?\\b`), (m) => nextMonthDay(MONTHS[m[1].toLowerCase()], +m[2], today, m[3])); if (r) return r;
  r = take(st, new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE})\\b\\.?(?:\\s*,?\\s*(\\d{4}))?`), (m) => nextMonthDay(MONTHS[m[2].toLowerCase()], +m[1], today, m[3])); if (r) return r;
  r = take(st, /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, (m) => {
    const a = +m[1], b = +m[2]; let mo, d;
    if (a > 12 && b <= 12) { d = a; mo = b; } else if (b > 12 && a <= 12) { mo = a; d = b; } else if (a === b && a <= 12) { mo = a; d = b; } else return { ambiguous: true };
    return nextMonthDay(mo, d, today, m[3]) ?? { ambiguous: true };
  }); if (r) return r;
  r = take(st, /\b(?:day\s+after\s+tomorrow|samakalawa|sa\s+makalawa|makalawa)\b/, () => ({ date: addDays(today, 2) })); if (r) return r;
  r = take(st, /\b(?:tomorrow|tmrw|bukas)\b/, () => ({ date: addDays(today, 1) })); if (r) return r;
  r = take(st, /\b(?:today|tonight|ngayon(?:g\s+araw)?|mamayang\s+gabi)\b/, () => ({ date: today })); if (r) return r;
  r = take(st, /\b(?:in|after|sa\s+loob\s+ng|pagkatapos\s+ng|makalipas\s+ang)\s+(\d+|a|an|one|isang)\s*(days?|araw|weeks?|linggo|months?|buwan)\b/, (m) => {
    const n = WORD_NUM[m[1].toLowerCase()] ?? +m[1]; const u = m[2].toLowerCase();
    return { date: /month|buwan/.test(u) ? addMonths(today, n) : addDays(today, /week|linggo/.test(u) ? n * 7 : n) };
  }); if (r) return r;
  r = take(st, /\b(?:end\s+of\s+(?:the\s+)?month|month[-\s]?end|katapusan(?:\s+ng\s+buwan)?)\b/, () => { const [y, m] = today.split('-').map(Number); return { date: iso(y, m, daysIn(y, m)) }; }); if (r) return r;
  r = take(st, /\b(?:(?:next|this\s+coming|susunod\s+na|sa\s+susunod\s+na)\s+(?:week|linggo|month|buwan|year|taon)|(?:this|ngayong)\s+(?:week|linggo|month|buwan))\b/, (m) => ({ vague: m[0].trim() })); if (r) return r;
  r = take(st, new RegExp(`\\b(?:(next|this|coming|susunod\\s+na)\\s+)?(${WD_RE})\\b`), (m) => weekday(WEEKDAYS[m[2].toLowerCase()], (m[1] || '').toLowerCase(), today)); if (r) return r;
  r = take(st, /\bsa\s+linggo\b/, () => weekday(0, '', today)); if (r) return r;
  r = take(st, /\b(\d{1,2})(?:st|nd|rd|th)\b|\b(?:sa\s+)?ika-?(\d{1,2})\b/, (m) => { const d = nextDayOfMonth(+(m[1] || m[2]), today); return d ? { date: d } : undefined; }); if (r) return r;
  return {};
}
function weekday(target, mod, today) {
  let diff = (target - fromStr(today).getUTCDay() + 7) % 7;
  if (diff === 0 && mod !== 'this') diff = 7;
  let date = addDays(today, diff);
  if (mod === 'next' || mod.startsWith('susunod')) { if (mondayOf(date) === mondayOf(today)) date = addDays(date, 7); }
  return { date };
}

// ---------- time ----------
const AMBIG = 'AMBIG';
function parseTime(st) {
  let r = take(st, /(?:\bat\s+|@\s*)?\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/, (m) => {
    const h = +m[1], min = m[2] ? +m[2] : 0; if (h < 1 || h > 12 || min > 59) return undefined;
    return `${pad((h % 12) + (/p/i.test(m[3]) ? 12 : 0))}:${pad(min)}`;
  }); if (r) return r;
  r = take(st, /(?:\bat\s+|@\s*)?\b([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => { const h = +m[1]; return h >= 13 || h === 0 || h === 12 ? `${pad(h)}:${m[2]}` : AMBIG; }); if (r) return r;
  r = take(st, new RegExp(`\\balas[-\\s]?(\\d{1,2}|${Object.keys(SPANISH).join('|')})(?::(\\d{2}))?(?:\\s*(?:ng|nang)\\s*(umaga|tanghali|hapon|gabi|madaling[-\\s]?araw))?\\b`), (m) => {
    const h = SPANISH[m[1].toLowerCase()] ?? +m[1]; const min = m[2] ? +m[2] : 0; const p = (m[3] || '').toLowerCase();
    if (h < 1 || h > 12 || min > 59) return undefined;
    if (!p) return AMBIG;
    let h24 = h;
    if (p === 'hapon' && h < 12) h24 = h + 12; else if (p === 'gabi') h24 = h === 12 ? 0 : h < 12 ? h + 12 : h; else if (p === 'umaga' || p.startsWith('madaling')) h24 = h === 12 ? 0 : h;
    return `${pad(h24)}:${pad(min)}`;
  }); if (r) return r;
  r = take(st, /\b(?:at\s+)?noon\b|\b(?:ng\s+|sa\s+)?tanghali\b/, () => '12:00'); if (r) return r;
  return take(st, /\bmidnight\b/, () => '00:00') ?? null;
}

// ---------- amounts ----------
const num = (s) => parseFloat(String(s).replace(/,/g, ''));
const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
function parseAmount(st) {
  let r = take(st, new RegExp(`(?:₱|\\bphp\\.?\\s*|\\bp\\s*(?=\\d))\\s*${NUM}(\\s*k\\b)?`), (m) => num(m[1]) * (m[2] ? 1000 : 1));
  if (r === undefined) r = take(st, new RegExp(`\\b${NUM}\\s*(k\\s*)?(?:pesos?|piso|php)\\b`), (m) => num(m[1]) * (m[2] ? 1000 : 1));
  return r !== undefined && r <= 1e9 ? Math.round(r * 100) / 100 : null;
}

// ---------- classification ----------
const count = (t, re) => (t.match(new RegExp(re, 'g')) || []).length;
const BILL = /\b(bayad|bayaran|magbayad|bayarin|bill|bills|payment|pay|utang|hulog|amortization|kuryente|tubig|internet|wifi|wi-fi|meralco|maynilad|pldt|converge|netflix|spotify|subscription|rent|upa|renta|insurance|loan|tuition)\b/;
const APPT = /\b(appointment|appt|checkup|check-up|meeting|meet|interview|consultation|consult|dentist|dentista|doctor|doktor|clinic|therapy|haircut|salon|flight|mass|binyag|kasal|wedding|party|reunion|lakad|event|dinner|lunch|sched|schedule)\b/;
const REMIND = /\b(remind|reminder|paalala|paalalahanan|ipaalala)\b/;
const DOC = /\b(expires?|expiry|expiration|expiring|vence|valid\s+until)\b/;
const CATS = [
  ['health', /\b(doctor|dentist|dentista|clinic|checkup|check-up|medicine|gamot|hospital|pharmacy|vaccine|therapy|lab|ngipin|bakuna)\b/],
  ['documents', /\b(passport|license|licence|nbi|clearance|philhealth|sss|pag-?ibig|tin|birth certificate|visa|renew|notarize|barangay)\b/],
  ['bills', /\b(bill|bills|bayad|bayaran|pay|utang|hulog|rent|upa|tuition)\b/],
  ['school', /\b(assignment|exam|quiz|thesis|school|homework|class|requirements?|takdang)\b/],
  ['work', /\b(meeting|report|client|boss|office|submit|presentation|email|project|deadline|invoice|proposal)\b/],
  ['errands', /\b(grocery|groceries|palengke|bili|bumili|buy|pickup|pick up|deliver|mall|laundry|labada|repair|ayusin)\b/],
  ['personal', /\b(birthday|anniversary|gift|regalo|family|mama|papa|nanay|tatay|friend)\b/],
];
const RECUR = [
  [/\b(?:every\s+day|everyday|daily|araw-?araw|bawat\s+araw)\b/, 'daily'], [/\b(?:every\s+week|weekly|linggu-?linggo|bawat\s+linggo)\b/, 'weekly'],
  [/\b(?:every\s+month|monthly|buwan-?buwan|bawat\s+buwan|kada\s+buwan)\b/, 'monthly'], [/\b(?:every\s+year|yearly|annually|taon-?taon|bawat\s+taon)\b/, 'yearly'],
  [new RegExp(`\\bevery\\s+(?=(?:${WD_RE})\\b)`), 'weekly'], [/\bevery\s+(?=\d{1,2}(?:st|nd|rd|th)\b)/, 'monthly'],
];
const EDGE = new Set(['sa', 'on', 'by', 'at', 'ng', 'nang', 'until', 'before', 'due', 'para', 'for', 'the', 'ang', 'of', 'ni', 'kay', 'hanggang', 'bago', 'every', 'each', 'in', 'after', 'this', 'next', 'and', 'with', 'expires', 'expire', 'expiry', 'expiration', 'vence', 'valid', 'pa']);
const LEAD = new Set(['sa', 'on', 'by', 'at', 'ng', 'nang', 'until', 'before', 'due', 'para', 'for', 'hanggang', 'bago', 'every']);
const PUNCT = /^[\s,.;:\-–—@!]+|[\s,.;:\-–—@!]+$/g;

function cleanTitle(s, kind) {
  let t = s.replace(/\s+/g, ' ').replace(PUNCT, '');
  if (kind === 'reminder') t = t.replace(/^(?:remind\s+me\s+(?:to\s+)?|reminder\s*(?:to|:)?\s*|paalalahanan\s+(?:ako\s+)?(?:na\s+)?|ipaalala\s+(?:sa\s+akin\s+)?(?:na\s+)?|paalala\s+(?:na\s+)?)/i, '');
  if (kind === 'bill') t = t.replace(/^(?:bayaran\s+ang|bayaran|bayad\s+sa|bayad\s+ng|bayad|magbayad\s+ng|magbayad\s+sa|pay\s+the|pay\s+for|pay|payment\s+for|payment)\s+/i, '').replace(/\s+bills?$/i, '');
  const w = t.split(' ').filter(Boolean);
  while (w.length > 1 && LEAD.has(w[0].toLowerCase())) w.shift();
  while (w.length > 1 && EDGE.has(w[w.length - 1].toLowerCase())) w.pop();
  t = w.join(' ').replace(PUNCT, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseInbox(input, { today } = {}) {
  const text = String(input || '').trim().slice(0, 500);
  today = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : toStr(new Date());
  const lower = text.toLowerCase(); const st = { s: text }; const warnings = [];

  let recurrence = 'none';
  for (const [re, v] of RECUR) if (take(st, re, () => v) !== undefined && recurrence === 'none') recurrence = v;

  let remindDays = take(st, /(?:remind\s+me\s+|paalalahanan\s+(?:ako\s+)?|ipaalala\s+(?:sa\s+akin\s+)?)?\b(\d+|an?|one|isang)\s*(days?|araw|weeks?|linggo)\s*(?:before|bago)(?:\s+(?:the\s+)?(?:due|deadline|date))?/, (m) => {
    const n = WORD_NUM[m[1].toLowerCase()] ?? +m[1]; return /week|linggo/i.test(m[2]) ? n * 7 : n;
  }) ?? null;

  let time = parseTime(st);
  take(st, /\b(?:(?:ng|nang|sa)\s+(?:umaga|hapon|gabi|madaling[-\s]?araw)|(?:in\s+the\s+)?(?:morning|afternoon|evening))\b/, () => true);
  if (time === AMBIG) { time = null; warnings.push('The time is unclear (AM or PM?). Please set it.'); }
  let amount = parseAmount(st);
  const hadCurrency = amount !== null;
  const d = parseDate(st, today);
  let due = d.date ?? null;

  if (d.ambiguous) warnings.push('The date format is unclear (day/month or month/day?). Please pick the date.');
  else if (d.vague) warnings.push(`I couldn’t pin down an exact date from “${d.vague}”. Please pick one.`);
  else if (due && d.year && due < today) warnings.push('That date has already passed. Check the year.');

  let priority = 'medium';
  if (take(st, /\b(?:urgent|asap|important|mahalaga|importante|madalian|priority)\b/, () => true)) priority = 'high';
  else if (take(st, /\b(?:whenever|low\s+priority|kung\s+may\s+time|someday)\b/, () => true)) priority = 'low';

  // kind
  const score = { bill: count(lower, BILL.source) * 2 + (hadCurrency ? 2 : 0), appointment: count(lower, APPT.source) * 2 + (time ? 1 : 0), reminder: REMIND.test(lower) && remindDays === null ? 3 : 0, document: DOC.test(lower) ? 3 : 0 };
  let kind = 'task'; let kindConfidence = 'high';
  if (score.reminder >= 3) kind = 'reminder';
  else if (score.document >= 3) kind = 'document';
  else if (score.bill >= 2 && score.bill >= score.appointment) { kind = 'bill'; if (score.appointment >= 2) kindConfidence = 'low'; }
  else if (score.appointment >= 2 || (score.appointment >= 1 && due && recurrence === 'none')) kind = 'appointment';
  else if (!due && !time) kindConfidence = 'medium';
  if (kind === 'bill' && amount === null) {
    amount = take(st, /\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{2,9}(?:\.\d{1,2})?)\b/, (m) => num(m[1])) ?? null;
    if (amount === null) warnings.push('No amount found. Please enter it.');
  }
  if (kind === 'task' && time) warnings.push('Tasks don’t store a time. Switch the type to Appointment or Reminder to keep it.');
  if (kindConfidence === 'low') warnings.push('Not sure if this is a bill or an appointment. Check the type.');

  let category = 'general';
  for (const [c, re] of CATS) if (re.test(lower)) { category = c; break; }

  if (kind === 'bill' && recurrence === 'daily') recurrence = 'none';
  if (['appointment', 'reminder', 'document'].includes(kind) && recurrence !== 'none') { warnings.push('Repeating isn’t supported for this type, so it was ignored.'); recurrence = 'none'; }

  let remindIsDefault = false;
  if (remindDays === null && due) { if (kind === 'bill') { remindDays = 3; remindIsDefault = true; } else if (kind === 'appointment') { remindDays = 1; remindIsDefault = true; } }
  if (kind === 'reminder' || kind === 'document') remindDays = null;

  let title = cleanTitle(st.s, kind);
  if (!title) { title = ''; warnings.push('Add a title.'); }
  if (!due && ['bill', 'appointment', 'reminder'].includes(kind) && !d.ambiguous && !d.vague) warnings.push('No date found. Please pick one.');
  else if (!due && kind === 'task' && !d.ambiguous && !d.vague) warnings.push('No clear deadline found. Pick a date or save without one.');

  return { kind, kind_confidence: kindConfidence, title, amount, due_date: due, time, category: kind === 'task' ? category : null, priority, recurrence, remind_days_before: remindDays, remind_is_default: remindIsDefault, warnings };
}