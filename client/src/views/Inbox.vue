<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Wallet, Plus, Trash2, ChevronLeft, ChevronRight, Settings } from 'lucide-vue-next';
import BaseModal from '../components/BaseModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { api } from '../lib/api';
import { money, fmtDate, todayStr } from '../lib/format';
import { useAuth } from '../stores/auth';
import { useToast } from '../stores/toast';

const toast = useToast(); const auth = useAuth();
const TABS = [['sweldo', 'Sweldo'], ['gastos', 'Gastos'], ['utang', 'Utang']];
const tab = ref('sweldo');
const today = ref(todayStr());

/* ---------- Date helpers (YYYY-MM-DD strings, local time) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const parts = (s) => s.split('-').map(Number); // [y, m(1-12), d]
const dim = (y, m0) => new Date(y, m0 + 1, 0).getDate();
const build = (y, m0, d) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const addDays = (s, n) => { const [y, m, d] = parts(s); const t = new Date(y, m - 1, d + n); return build(t.getFullYear(), t.getMonth(), t.getDate()); };
const addMonths = (s, n) => { const [y, m, d] = parts(s); const t = y * 12 + (m - 1) + n; const yy = Math.floor(t / 12); const mm = t % 12; return build(yy, mm, Math.min(d, dim(yy, mm))); };
const daysDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
const monthLabel = (key, opts = { month: 'long', year: 'numeric' }) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-PH', opts);
const compact = (n) => `₱${new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`;
const amt = (b) => Number(b.amount) || 0;

/* ---------- Saved settings + utang list (saved on this device) ---------- */
const KEY = () => `ayosko:pera:${auth.user?.id || 'local'}`;
const store = reactive({ pay: { schedule: 'twice', a: 15, b: 30, amount: 0 }, budget: 0, debts: [] });
function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY()) || 'null');
    if (!s) return;
    Object.assign(store.pay, s.pay || {});
    store.budget = Number(s.budget) || 0;
    store.debts = Array.isArray(s.debts) ? s.debts : [];
  } catch { /* ignore corrupt data */ }
}
loadStore();
watch(store, () => { try { localStorage.setItem(KEY(), JSON.stringify(store)); } catch { /* storage full/blocked */ } }, { deep: true });

/* ---------- Bills ---------- */
const bills = ref([]); const loading = ref(true);
async function load(spinner = true) {
  if (spinner) loading.value = true;
  today.value = todayStr();
  try { bills.value = (await api('/bills', { params: { sort: 'due_date', dir: 'asc', limit: 200 } })).data; }
  catch (e) { toast.error(e.message); } finally { loading.value = false; }
}
const refocus = () => document.visibilityState === 'visible' && load(false);
onMounted(() => { load(); document.addEventListener('visibilitychange', refocus); });
onBeforeUnmount(() => document.removeEventListener('visibilitychange', refocus));

/* ---------- Utang helpers ---------- */
const KINDS = { owe: 'Utang ko', hulugan: 'Hulugan', owed: 'Utang sa akin' };
const remaining = (d) => Math.max(0, (Number(d.total) || 0) - (Number(d.paid) || 0));

/* ---------- SWELDO: cut-off planner ---------- */
function paydayList(t) {
  const [y, m] = parts(t);
  const days = store.pay.schedule === 'twice' ? [store.pay.a, store.pay.b] : [store.pay.a];
  const out = [];
  for (let k = -2; k <= 3; k++) {
    const tt = y * 12 + (m - 1) + k; const yy = Math.floor(tt / 12); const mm = tt % 12;
    for (const d of days) out.push(build(yy, mm, Math.min(Math.max(1, Number(d) || 1), dim(yy, mm))));
  }
  return [...new Set(out)].sort();
}
const cycle = computed(() => {
  const list = paydayList(today.value);
  const start = [...list].reverse().find((d) => d <= today.value);
  const next = list.find((d) => d > today.value);
  const after = list.find((d) => d > next);
  return { start, next, after };
});
// Lahat ng kailangang bayaran: bills + (utang ko / hulugan na may due date)
const obligations = computed(() => {
  const out = [];
  for (const b of bills.value) {
    const date = String(b.due_date || '').slice(0, 10);
    if (date) out.push({ key: `b${b.id}`, title: b.name, amount: amt(b), date, paid: b.status === 'paid', src: 'Bill' });
  }
  for (const d of store.debts) {
    if (d.kind === 'owed' || !d.due) continue;
    const left = remaining(d);
    if (left > 0) out.push({ key: `d${d.id}`, title: d.name, amount: d.kind === 'hulugan' && Number(d.monthly) ? Math.min(Number(d.monthly), left) : left, date: d.due, paid: false, src: KINDS[d.kind] });
  }
  return out;
});
const planner = computed(() => {
  const { start, next, after } = cycle.value;
  const sum = (a, f = () => true) => a.filter(f).reduce((t, o) => t + o.amount, 0);
  const late = obligations.value.filter((o) => !o.paid && o.date < start).map((o) => ({ ...o, late: true }));
  const inCycle = obligations.value.filter((o) => o.date >= start && o.date < next);
  const items = [...late, ...inCycle].sort((a, b) => a.date.localeCompare(b.date));
  const total = sum(items); const unpaid = sum(items, (o) => !o.paid);
  return {
    items, total, unpaid, paid: total - unpaid, left: store.pay.amount - total,
    pct: store.pay.amount ? Math.min(100, (total / store.pay.amount) * 100) : 0,
    nextTotal: sum(obligations.value.filter((o) => o.date >= next && o.date < after)),
    daysLeft: daysDiff(today.value, next),
  };
});
const cutEnd = computed(() => addDays(cycle.value.next, -1));
const nextCutEnd = computed(() => addDays(cycle.value.after, -1));

/* ---------- GASTOS: monthly spending dashboard ---------- */
const month = ref(todayStr().slice(0, 7));
const shiftMonth = (n) => { month.value = addMonths(`${month.value}-01`, n).slice(0, 7); };
const totalsOf = (key) => {
  const r = { paid: 0, unpaid: 0 };
  for (const b of bills.value) if (String(b.due_date || '').startsWith(key)) r[b.status === 'paid' ? 'paid' : 'unpaid'] += amt(b);
  return { ...r, total: r.paid + r.unpaid };
};
const cur = computed(() => totalsOf(month.value));
const prevKey = computed(() => addMonths(`${month.value}-01`, -1).slice(0, 7));
const delta = computed(() => {
  const p = totalsOf(prevKey.value).total;
  if (!p) return '';
  const pct = ((cur.value.total - p) / p) * 100;
  return `${Math.abs(pct).toFixed(0)}% ${pct >= 0 ? 'higher' : 'lower'} than ${monthLabel(prevKey.value, { month: 'long' })}`;
});
const budgetPct = computed(() => (store.budget ? (cur.value.total / store.budget) * 100 : 0));
const budgetTone = computed(() => (budgetPct.value >= 100 ? '#ef4444' : budgetPct.value >= 80 ? '#f59e0b' : '#10b981'));
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];
const breakdown = computed(() => {
  const map = {};
  for (const b of bills.value) {
    if (!String(b.due_date || '').startsWith(month.value)) continue;
    const label = String(b.category || b.name || 'Untitled').trim(); const k = label.toLowerCase();
    map[k] ||= { label, total: 0, count: 0 };
    map[k].total += amt(b); map[k].count += 1;
  }
  const list = Object.values(map).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const sum = list.reduce((t, x) => t + x.total, 0);
  const rows = list.slice(0, 5).map((x, i) => ({ ...x, color: PALETTE[i] }));
  const rest = list.slice(5);
  if (rest.length) rows.push({ label: `Others (${rest.length})`, total: rest.reduce((t, x) => t + x.total, 0), count: rest.reduce((t, x) => t + x.count, 0), color: '#94a3b8' });
  return rows.map((r) => ({ ...r, pct: sum ? (r.total / sum) * 100 : 0 }));
});
const trend = computed(() => {
  const arr = [-5, -4, -3, -2, -1, 0].map((i) => { const key = addMonths(`${month.value}-01`, i).slice(0, 7); return { key, label: monthLabel(key, { month: 'short' }), ...totalsOf(key) }; });
  const max = Math.max(1, ...arr.map((m) => m.total));
  return arr.map((m) => ({ ...m, h: m.total ? Math.max(6, (m.total / max) * 100) : 0 }));
});

/* ---------- UTANG ---------- */
const groups = computed(() => ['owe', 'hulugan', 'owed'].map((k) => ({
  kind: k, label: KINDS[k],
  items: store.debts.filter((d) => d.kind === k).sort((a, b) => (remaining(a) === 0) - (remaining(b) === 0) || (a.due || '9999').localeCompare(b.due || '9999')),
})).filter((g) => g.items.length));
const debtTotals = computed(() => {
  let owe = 0; let owed = 0; let monthly = 0;
  for (const d of store.debts) {
    const left = remaining(d); if (!left) continue;
    if (d.kind === 'owed') owed += left; else owe += left;
    if (d.kind === 'hulugan') monthly += Math.min(Number(d.monthly) || left, left);
  }
  return { owe, owed, monthly };
});
const dueInfo = (d) => {
  if (!d.due || !remaining(d)) return null;
  const n = daysDiff(today.value, d.due);
  if (n < 0) return { text: `${-n} day${n === -1 ? '' : 's'} late`, cls: 'bg-red-100 text-red-700' };
  if (n === 0) return { text: 'Due today', cls: 'bg-amber-100 text-amber-800' };
  if (n <= 7) return { text: `Due in ${n} day${n === 1 ? '' : 's'}`, cls: 'bg-amber-100 text-amber-800' };
  return { text: `Due ${fmtDate(d.due)}`, cls: 'bg-slate-100 text-slate-600' };
};

/* ---------- Modals (one form at a time) ---------- */
const modal = ref(null); const err = ref(''); const draft = reactive({}); const delDebt = ref(null);
const MODAL_TITLE = { pay: 'Sweldo settings', budget: 'Monthly budget', debt: 'Add utang / hulugan', payment: 'Record payment' };
function open(kind, data = {}) { Object.keys(draft).forEach((k) => delete draft[k]); Object.assign(draft, data); err.value = ''; modal.value = kind; }
const openPay = () => open('pay', { schedule: store.pay.schedule, a: store.pay.a, b: store.pay.b, amount: store.pay.amount || '' });
const openBudget = () => open('budget', { budget: store.budget || '' });
const openDebt = (kind = 'owe') => open('debt', { kind, name: '', total: '', paid: '', monthly: '', due: '' });
const openPayment = (d) => open('payment', { id: d.id, name: d.name, amount: d.kind === 'hulugan' && Number(d.monthly) ? Math.min(Number(d.monthly), remaining(d)) : remaining(d) });

function submit() {
  const n = (v) => Number(v) || 0;
  if (modal.value === 'pay') {
    const a = Math.round(n(draft.a)); const b = Math.round(n(draft.b));
    if (n(draft.amount) <= 0) return (err.value = 'Enter how much you get per payday.');
    if (a < 1 || a > 31 || (draft.schedule === 'twice' && (b < 1 || b > 31))) return (err.value = 'Payday must be a day from 1 to 31.');
    Object.assign(store.pay, { schedule: draft.schedule, a, b: draft.schedule === 'twice' ? b : store.pay.b, amount: n(draft.amount) });
    toast.success('Saved.');
  } else if (modal.value === 'budget') {
    if (n(draft.budget) < 0) return (err.value = 'Budget can’t be negative.');
    store.budget = n(draft.budget); toast.success(store.budget ? 'Budget saved.' : 'Budget cleared.');
  } else if (modal.value === 'debt') {
    if (!String(draft.name || '').trim()) return (err.value = 'Name is required.');
    if (n(draft.total) <= 0) return (err.value = 'Total amount must be more than 0.');
    if (n(draft.paid) < 0 || n(draft.paid) > n(draft.total)) return (err.value = 'Paid so far can’t be more than the total.');
    store.debts.push({ id: crypto.randomUUID?.() || `${Date.now()}${Math.random()}`, kind: draft.kind, name: String(draft.name).trim(), total: n(draft.total), paid: n(draft.paid), monthly: draft.kind === 'hulugan' ? n(draft.monthly) : 0, due: draft.due || '' });
    toast.success('Added.');
  } else if (modal.value === 'payment') {
    const d = store.debts.find((x) => x.id === draft.id);
    if (!d) return (modal.value = null);
    const a = n(draft.amount);
    if (a <= 0) return (err.value = 'Enter the amount paid.');
    d.paid = Math.min(Number(d.total), (Number(d.paid) || 0) + a);
    if (!remaining(d)) d.due = ''; else if (d.kind === 'hulugan' && d.due) d.due = addMonths(d.due, 1);
    toast.success(remaining(d) ? 'Payment recorded.' : 'All paid. Congrats!');
  }
  modal.value = null;
}
function removeDebt() { store.debts = store.debts.filter((d) => d.id !== delDebt.value.id); delDebt.value = null; toast.success('Deleted.'); }
</script>

<template>
  <div class="mx-auto max-w-3xl min-w-0">
    <div class="mb-4">
      <h1 class="flex items-center gap-2 text-2xl font-bold"><Wallet class="h-6 w-6 text-indigo-600" /> Pera</h1>
      <p class="text-sm text-slate-500">Your sweldo, gastos at utang, lahat sa isang lugar.</p>
    </div>

    <div class="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Pera sections">
      <button v-for="[k, l] in TABS" :key="k" role="tab" :aria-selected="tab === k" class="min-h-[40px] flex-1 rounded-lg px-3 text-sm font-medium transition" :class="tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'" @click="tab = k">{{ l }}</button>
    </div>

    <p v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading…</p>

    <!-- ===================== SWELDO ===================== -->
    <template v-else-if="tab === 'sweldo'">
      <section v-if="!store.pay.amount" class="card py-10 text-center">
        <p class="font-semibold">Plan your sweldo</p>
        <p class="mx-auto mb-4 mt-1 max-w-sm text-sm text-slate-500">Tell us when and how much you get paid. We’ll show which bills fall before your next payday and how much will be left.</p>
        <button class="btn-primary" @click="openPay">Set up payday</button>
      </section>

      <template v-else>
        <section class="card mb-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-slate-500">Cut-off {{ fmtDate(cycle.start) }} – {{ fmtDate(cutEnd) }}</p>
              <p class="font-semibold">Next sweldo: {{ fmtDate(cycle.next) }} <span class="font-normal text-slate-500">· {{ planner.daysLeft === 1 ? 'tomorrow' : `in ${planner.daysLeft} days` }}</span></p>
            </div>
            <button class="btn-ghost btn-sm shrink-0" @click="openPay"><Settings class="h-4 w-4" /> Edit</button>
          </div>
          <div class="mt-4 rounded-xl p-4 text-center" :class="planner.left >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'">
            <p class="text-xs font-medium">{{ planner.left >= 0 ? 'Matitira pagkatapos ng lahat ng bayarin' : 'Kulang ng' }}</p>
            <p class="break-words text-3xl font-extrabold">{{ money(Math.abs(planner.left)) }}</p>
          </div>
          <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" :aria-valuenow="Math.round(planner.pct)" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full transition-all" :class="planner.left >= 0 ? 'bg-emerald-500' : 'bg-red-500'" :style="{ width: planner.pct + '%' }" /></div>
          <dl class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="min-w-0 rounded-lg bg-slate-50 p-2"><dt class="text-slate-500">Sweldo</dt><dd class="break-words font-bold text-slate-800">{{ money(store.pay.amount) }}</dd></div>
            <div class="min-w-0 rounded-lg bg-slate-50 p-2"><dt class="text-slate-500">Bayad na</dt><dd class="break-words font-bold text-emerald-700">{{ money(planner.paid) }}</dd></div>
            <div class="min-w-0 rounded-lg bg-slate-50 p-2"><dt class="text-slate-500">Kailangan pang bayaran</dt><dd class="break-words font-bold text-amber-700">{{ money(planner.unpaid) }}</dd></div>
          </dl>
        </section>

        <section class="mb-4">
          <h2 class="mb-2 px-1 font-semibold">Bayarin sa cut-off na ito <span class="text-sm font-normal text-slate-500">{{ planner.items.length }}</span></h2>
          <div v-if="!planner.items.length" class="card py-8 text-center text-sm text-slate-500">Walang bayarin sa cut-off na ito.</div>
          <ul v-else class="card divide-y overflow-hidden !p-0">
            <li v-for="o in planner.items" :key="o.key" class="flex items-center gap-3 p-3">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="o.paid && 'text-slate-400 line-through'">{{ o.title }}</p>
                <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span class="badge">{{ o.src }}</span><span>{{ fmtDate(o.date) }}</span>
                  <span v-if="o.late" class="font-medium text-red-600">Atrasado</span><span v-else-if="o.paid" class="font-medium text-emerald-600">Paid</span>
                </p>
              </div>
              <b class="shrink-0 text-sm" :class="o.paid && 'text-slate-400'">{{ money(o.amount) }}</b>
            </li>
          </ul>
        </section>

        <p class="card mb-2 text-sm text-slate-600">Susunod na cut-off ({{ fmtDate(cycle.next) }} – {{ fmtDate(nextCutEnd) }}): <b class="text-slate-800">{{ money(planner.nextTotal) }}</b> na bayarin<span v-if="store.pay.amount"> mula sa sweldo mong {{ money(store.pay.amount) }}</span>.</p>
        <p class="pb-4 text-center text-xs text-slate-500">Payday settings and utang are saved on this device.</p>
      </template>
    </template>

    <!-- ===================== GASTOS ===================== -->
    <template v-else-if="tab === 'gastos'">
      <div class="mb-3 flex items-center justify-between gap-2">
        <button class="btn-ghost btn-icon" aria-label="Previous month" @click="shiftMonth(-1)"><ChevronLeft class="h-5 w-5" /></button>
        <h2 class="text-center font-semibold">{{ monthLabel(month) }}</h2>
        <button class="btn-ghost btn-icon" aria-label="Next month" @click="shiftMonth(1)"><ChevronRight class="h-5 w-5" /></button>
      </div>

      <section class="card mb-4">
        <p class="text-xs text-slate-500">Total na gastos at bayarin</p>
        <p class="break-words text-3xl font-extrabold">{{ money(cur.total) }}</p>
        <p v-if="delta" class="mt-0.5 text-xs text-slate-500">{{ delta }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          <div class="min-w-0 rounded-lg bg-emerald-50 p-2 text-emerald-800"><b class="block break-words text-sm">{{ money(cur.paid) }}</b>Nabayaran</div>
          <div class="min-w-0 rounded-lg bg-amber-50 p-2 text-amber-800"><b class="block break-words text-sm">{{ money(cur.unpaid) }}</b>Hindi pa bayad</div>
        </div>
        <div class="mt-4 border-t border-slate-100 pt-3">
          <div class="flex items-center justify-between gap-2"><p class="text-sm font-medium">Monthly budget</p><button class="btn-ghost btn-sm" @click="openBudget">{{ store.budget ? 'Edit' : 'Set budget' }}</button></div>
          <template v-if="store.budget">
            <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full transition-all" :style="{ width: Math.min(100, budgetPct) + '%', background: budgetTone }" /></div>
            <p class="mt-1.5 text-xs text-slate-600">{{ budgetPct.toFixed(0) }}% of {{ money(store.budget) }} · <b :class="store.budget - cur.total >= 0 ? 'text-emerald-700' : 'text-red-600'">{{ store.budget - cur.total >= 0 ? `${money(store.budget - cur.total)} left` : `Over by ${money(cur.total - store.budget)}` }}</b></p>
          </template>
          <p v-else class="mt-1 text-xs text-slate-500">Set a budget to see how much you have left each month.</p>
        </div>
      </section>

      <section class="card mb-4">
        <h2 class="mb-3 text-sm font-semibold text-slate-700">Saan napunta</h2>
        <p v-if="!breakdown.length" class="py-6 text-center text-sm text-slate-500">No bills this month.</p>
        <template v-else>
          <div class="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" :aria-label="`Breakdown: ${breakdown.map((r) => `${r.label} ${r.pct.toFixed(0)}%`).join(', ')}`"><div v-for="r in breakdown" :key="r.label" :style="{ width: r.pct + '%', background: r.color }" :title="`${r.label}: ${money(r.total)}`" /></div>
          <ul class="space-y-3">
            <li v-for="r in breakdown" :key="r.label">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="flex min-w-0 items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full" :style="{ background: r.color }" /><span class="truncate font-medium">{{ r.label }}</span><span class="shrink-0 text-xs text-slate-500">×{{ r.count }}</span></span>
                <span class="shrink-0 text-right"><b>{{ money(r.total) }}</b> <span class="text-xs text-slate-500">{{ r.pct.toFixed(0) }}%</span></span>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: r.pct + '%', background: r.color }" /></div>
            </li>
          </ul>
        </template>
      </section>

      <section class="card mb-4">
        <div class="mb-3 flex items-center justify-between gap-2"><h2 class="text-sm font-semibold text-slate-700">Last 6 months</h2>
          <div class="flex gap-3 text-xs text-slate-500"><span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Paid</span><span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-amber-500" />Unpaid</span></div></div>
        <div class="flex h-32 items-end gap-3 border-b border-slate-200" role="img" aria-label="Monthly totals for the last 6 months">
          <div v-for="m in trend" :key="m.key" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" :title="`${monthLabel(m.key)}: ${money(m.total)}`">
            <span class="text-[10px] font-medium text-slate-600">{{ m.total ? compact(m.total) : '' }}</span>
            <div class="flex w-full max-w-[3rem] flex-col overflow-hidden rounded-t-md" :style="{ height: m.h * 0.75 + '%' }"><div class="bg-amber-500" :style="{ height: (m.total ? (m.unpaid / m.total) * 100 : 0) + '%' }" /><div class="bg-emerald-500" :style="{ height: (m.total ? (m.paid / m.total) * 100 : 0) + '%' }" /></div>
          </div>
        </div>
        <div class="mt-1 flex gap-3"><span v-for="m in trend" :key="m.key" class="min-w-0 flex-1 text-center text-xs" :class="m.key === month ? 'font-semibold text-indigo-700' : 'text-slate-500'">{{ m.label }}</span></div>
      </section>
      <p class="pb-4 text-center text-xs text-slate-500">Based on your Bills, grouped by bill name until categories are added. Budget is saved on this device.</p>
    </template>

    <!-- ===================== UTANG ===================== -->
    <template v-else>
      <div class="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="min-w-0 rounded-xl bg-red-50 p-3 text-red-700"><b class="block break-words text-sm">{{ money(debtTotals.owe) }}</b>Utang ko</div>
        <div class="min-w-0 rounded-xl bg-emerald-50 p-3 text-emerald-800"><b class="block break-words text-sm">{{ money(debtTotals.owed) }}</b>Utang sa akin</div>
        <div class="min-w-0 rounded-xl bg-amber-50 p-3 text-amber-800"><b class="block break-words text-sm">{{ money(debtTotals.monthly) }}</b>Hulugan / buwan</div>
      </div>
      <button class="btn-primary mb-4 w-full sm:w-auto" @click="openDebt()"><Plus class="h-4 w-4" /> Add utang / hulugan</button>

      <div v-if="!groups.length" class="card py-10 text-center"><p class="font-medium">Wala pang naka-record</p><p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add what you owe, what others owe you, and your installments (GLoan, SPayLater, appliance hulugan).</p></div>
      <section v-for="g in groups" :key="g.kind" class="mb-5">
        <h2 class="mb-2 px-1 font-semibold">{{ g.label }} <span class="text-sm font-normal text-slate-500">{{ g.items.length }}</span></h2>
        <ul class="card divide-y overflow-hidden !p-0">
          <li v-for="d in g.items" :key="d.id" class="p-3" :class="!remaining(d) && 'opacity-60'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0"><p class="break-words font-medium" :class="!remaining(d) && 'line-through'">{{ d.name }}</p>
                <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span v-if="!remaining(d)" class="badge badge-success">Settled</span><span v-if="dueInfo(d)" :class="['badge', dueInfo(d).cls]">{{ dueInfo(d).text }}</span><span v-if="d.kind === 'hulugan' && Number(d.monthly)">{{ money(d.monthly) }}/month</span></p></div>
              <div class="shrink-0 text-right"><b class="block text-sm">{{ money(remaining(d)) }}</b><span class="text-xs text-slate-500">of {{ money(d.total) }}</span></div>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :class="d.kind === 'owed' ? 'bg-emerald-500' : 'bg-indigo-500'" :style="{ width: Math.min(100, ((Number(d.paid) || 0) / (Number(d.total) || 1)) * 100) + '%' }" /></div>
            <div class="mt-2 flex items-center justify-end gap-1">
              <button v-if="remaining(d)" class="btn-soft btn-sm" @click="openPayment(d)">{{ d.kind === 'owed' ? 'Received' : 'Record payment' }}</button>
              <button class="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Delete" @click="delDebt = d"><Trash2 class="h-4 w-4" /></button>
            </div>
          </li>
        </ul>
      </section>
      <p class="pb-4 text-center text-xs text-slate-500">Your utang list is saved on this device. Items with a due date also show up in your Sweldo plan.</p>
    </template>

    <!-- ===================== Forms ===================== -->
    <BaseModal :open="!!modal" :title="MODAL_TITLE[modal] || ''" @close="modal = null">
      <form class="space-y-4" novalidate @submit.prevent="submit">
        <template v-if="modal === 'pay'">
          <div><label class="label" for="pf-sched">How often do you get paid?</label>
            <select id="pf-sched" v-model="draft.schedule" class="input"><option value="twice">Twice a month (kinsenas / katapusan)</option><option value="monthly">Once a month</option></select></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label" for="pf-a">{{ draft.schedule === 'twice' ? 'First payday (day)' : 'Payday (day)' }}</label><input id="pf-a" v-model="draft.a" type="number" min="1" max="31" inputmode="numeric" class="input" /></div>
            <div v-if="draft.schedule === 'twice'"><label class="label" for="pf-b">Second payday (day)</label><input id="pf-b" v-model="draft.b" type="number" min="1" max="31" inputmode="numeric" class="input" /></div>
          </div>
          <p class="hint">Days like 30 or 31 become the last day of shorter months.</p>
          <div><label class="label" for="pf-amt">Sweldo per payday (₱)</label><input id="pf-amt" v-model="draft.amount" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
        </template>

        <template v-else-if="modal === 'budget'">
          <div><label class="label" for="bf">Budget for each month (₱)</label><input id="bf" v-model="draft.budget" type="number" min="0" step="0.01" inputmode="decimal" class="input" /><p class="hint">Leave empty or 0 to remove the budget.</p></div>
        </template>

        <template v-else-if="modal === 'debt'">
          <div><label class="label" for="df-kind">Type</label><select id="df-kind" v-model="draft.kind" class="input"><option value="owe">Utang ko (I owe someone)</option><option value="owed">Utang sa akin (someone owes me)</option><option value="hulugan">Hulugan (installment)</option></select></div>
          <div><label class="label" for="df-name">{{ draft.kind === 'hulugan' ? 'What is it?' : 'Who?' }}<span class="text-red-500"> *</span></label><input id="df-name" v-model="draft.name" class="input" maxlength="80" :placeholder="draft.kind === 'hulugan' ? 'e.g. SPayLater, phone' : 'e.g. Ate Joy'" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label" for="df-total">Total (₱)<span class="text-red-500"> *</span></label><input id="df-total" v-model="draft.total" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
            <div><label class="label" for="df-paid">Paid so far (₱)</label><input id="df-paid" v-model="draft.paid" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
          </div>
          <div v-if="draft.kind === 'hulugan'"><label class="label" for="df-monthly">Monthly payment (₱)</label><input id="df-monthly" v-model="draft.monthly" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
          <div><label class="label" for="df-due">{{ draft.kind === 'hulugan' ? 'Next due date' : 'Due date (optional)' }}</label><input id="df-due" v-model="draft.due" type="date" class="input" /></div>
        </template>

        <template v-else-if="modal === 'payment'">
          <p class="text-sm text-slate-600">{{ draft.name }}</p>
          <div><label class="label" for="pm-amt">Amount (₱)</label><input id="pm-amt" v-model="draft.amount" type="number" min="0" step="0.01" inputmode="decimal" class="input" /></div>
        </template>

        <p v-if="err" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ err }}</p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn-ghost w-full sm:w-auto" @click="modal = null">Cancel</button>
          <button class="btn-primary w-full sm:w-auto">Save</button>
        </div>
      </form>
    </BaseModal>

    <ConfirmDialog :open="!!delDebt" :message="`Delete “${delDebt?.name}”? This cannot be undone.`" @cancel="delDebt = null" @confirm="removeDebt" />
  </div>
</template>