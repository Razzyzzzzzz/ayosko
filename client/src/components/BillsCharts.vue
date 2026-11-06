<script setup>
import { computed, ref } from 'vue';
import { money } from '../lib/format';

const props = defineProps({ bills: { type: Array, default: () => [] } });

const PAID = '#10b981';
const UNPAID = '#f59e0b';
const R = 40;
const C = 2 * Math.PI * R;

const amt = (b) => Number(b.amount) || 0;
const paid = computed(() => props.bills.filter((b) => b.status === 'paid'));
const unpaid = computed(() => props.bills.filter((b) => b.status !== 'paid'));
const paidTotal = computed(() => paid.value.reduce((s, b) => s + amt(b), 0));
const unpaidTotal = computed(() => unpaid.value.reduce((s, b) => s + amt(b), 0));
const total = computed(() => paidTotal.value + unpaidTotal.value);
const paidLen = computed(() => (total.value ? (paidTotal.value / total.value) * C : 0));
const paidPct = computed(() => (total.value ? Math.round((paidTotal.value / total.value) * 100) : 0));

// Monthly totals (by due date), huling 6 buwan na may bills
const months = computed(() => {
  const map = {};
  for (const b of props.bills) {
    if (!b.due_date) continue;
    const key = String(b.due_date).slice(0, 7);
    map[key] ||= { key, paid: 0, unpaid: 0 };
    map[key][b.status === 'paid' ? 'paid' : 'unpaid'] += amt(b);
  }
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-6)
    .map((m) => ({ ...m, total: m.paid + m.unpaid, label: new Date(`${m.key}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) }));
});
const maxMonth = computed(() => Math.max(1, ...months.value.map((m) => m.total)));
// Breakdown: saan napupunta ang pera. Naka-group by category (kung meron na) o by bill name; top 5 + Others
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];
const OTHERS = '#94a3b8';
const VIEWS = [['all', 'All'], ['paid', 'Paid'], ['unpaid', 'Unpaid']];
const view = ref('all');
const breakdown = computed(() => {
  const src = props.bills.filter((b) => view.value === 'all' || (view.value === 'paid' ? b.status === 'paid' : b.status !== 'paid'));
  const map = {};
  for (const b of src) {
    const label = String(b.category || b.name || 'Untitled').trim();
    const k = label.toLowerCase();
    map[k] ||= { label, total: 0, count: 0 };
    map[k].total += amt(b); map[k].count += 1;
  }
  const list = Object.values(map).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const sum = list.reduce((t, x) => t + x.total, 0);
  const rows = list.slice(0, 5).map((x, i) => ({ ...x, color: PALETTE[i] }));
  const rest = list.slice(5);
  if (rest.length) rows.push({ label: `Others (${rest.length})`, total: rest.reduce((t, x) => t + x.total, 0), count: rest.reduce((t, x) => t + x.count, 0), color: OTHERS });
  return { sum, rows: rows.map((r) => ({ ...r, pct: sum ? (r.total / sum) * 100 : 0 })) };
});
const compact = (n) => `₱${new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`;
</script>

<template>
  <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    <!-- Donut: paid vs unpaid -->
    <div class="card min-w-0 p-4">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">Paid vs unpaid</h2>
      <div class="flex items-center gap-5">
        <svg viewBox="0 0 100 100" class="h-36 w-36 shrink-0" role="img" :aria-label="`${paidPct}% paid. Paid ${money(paidTotal)}, unpaid ${money(unpaidTotal)}`">
          <circle cx="50" cy="50" :r="R" fill="none" :stroke="total ? UNPAID : '#e2e8f0'" stroke-width="14" />
          <circle v-if="total" cx="50" cy="50" :r="R" fill="none" :stroke="PAID" stroke-width="14"
            :stroke-dasharray="`${paidLen} ${C}`" transform="rotate(-90 50 50)" />
          <text x="50" y="49" text-anchor="middle" class="fill-slate-800" style="font-size: 16px; font-weight: 700">{{ paidPct }}%</text>
          <text x="50" y="62" text-anchor="middle" class="fill-slate-500" style="font-size: 8px">paid</text>
        </svg>
        <ul class="min-w-0 flex-1 space-y-3 text-sm">
          <li class="flex items-start gap-2">
            <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ background: PAID }" />
            <span class="min-w-0"><b class="block">{{ money(paidTotal) }}</b><span class="text-xs text-slate-500">Paid · {{ paid.length }} bill{{ paid.length === 1 ? '' : 's' }}</span></span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ background: UNPAID }" />
            <span class="min-w-0"><b class="block">{{ money(unpaidTotal) }}</b><span class="text-xs text-slate-500">Unpaid · {{ unpaid.length }} bill{{ unpaid.length === 1 ? '' : 's' }}</span></span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bar: monthly totals -->
    <div class="card min-w-0 p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-700">Monthly totals</h2>
        <div class="flex gap-3 text-xs text-slate-500">
          <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: PAID }" />Paid</span>
          <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: UNPAID }" />Unpaid</span>
        </div>
      </div>
      <p v-if="!months.length" class="py-10 text-center text-sm text-slate-500">No dated bills yet.</p>
      <template v-else>
        <div class="flex h-36 items-end gap-3 border-b border-slate-200" role="img" aria-label="Bill totals per month">
          <div v-for="m in months" :key="m.key" class="flex h-full flex-1 flex-col items-center justify-end gap-1" :title="`${m.label}: ${money(m.total)} (paid ${money(m.paid)}, unpaid ${money(m.unpaid)})`">
            <span class="text-[11px] font-medium text-slate-600">{{ compact(m.total) }}</span>
            <div class="flex w-full max-w-[3.5rem] flex-col overflow-hidden rounded-t-md" :style="{ height: Math.max(4, (m.total / maxMonth) * 80) + '%' }">
              <div :style="{ height: (m.unpaid / m.total) * 100 + '%', background: UNPAID }" />
              <div :style="{ height: (m.paid / m.total) * 100 + '%', background: PAID }" />
            </div>
          </div>
        </div>
        <div class="mt-1 flex gap-3">
          <span v-for="m in months" :key="m.key" class="flex-1 text-center text-xs text-slate-500">{{ m.label }}</span>
        </div>
      </template>
    </div>

    <!-- Breakdown: where the money goes -->
    <div class="card min-w-0 p-4 md:col-span-2">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-700">Expense breakdown</h2>
        <div class="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Breakdown filter">
          <button v-for="[k, l] in VIEWS" :key="k" type="button" :aria-pressed="view === k" class="rounded-md px-3 py-1.5 transition" :class="view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'" @click="view = k">{{ l }}</button>
        </div>
      </div>
      <p v-if="!breakdown.rows.length" class="py-8 text-center text-sm text-slate-500">No bills to break down.</p>
      <template v-else>
        <p class="mb-2 text-xs text-slate-500">Total <b class="text-slate-800">{{ money(breakdown.sum) }}</b></p>
        <div class="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" :aria-label="`Expense breakdown: ${breakdown.rows.map((r) => `${r.label} ${r.pct.toFixed(0)}%`).join(', ')}`">
          <div v-for="r in breakdown.rows" :key="r.label" :style="{ width: r.pct + '%', background: r.color }" :title="`${r.label}: ${money(r.total)}`" />
        </div>
        <ul class="space-y-3">
          <li v-for="r in breakdown.rows" :key="r.label">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full" :style="{ background: r.color }" /><span class="truncate font-medium">{{ r.label }}</span><span class="shrink-0 text-xs text-slate-500">×{{ r.count }}</span></span>
              <span class="shrink-0 text-right"><b>{{ money(r.total) }}</b> <span class="text-xs text-slate-500">{{ r.pct.toFixed(0) }}%</span></span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: r.pct + '%', background: r.color }" /></div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>