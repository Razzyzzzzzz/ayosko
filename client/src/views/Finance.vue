<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ChevronLeft, ChevronRight, Plus, List, Target, Tags, TrendingUp, TrendingDown, Lightbulb, Wallet, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-vue-next';
import BaseModal from '../components/BaseModal.vue';
import TransactionForm from '../components/TransactionForm.vue';
import CategoryManager from '../components/CategoryManager.vue';
import { api } from '../lib/api';
import { useCategories } from '../stores/categories';
import { money, moneySigned, fmtDate, todayStr, cap } from '../lib/format';
import { useToast } from '../stores/toast';

const toast = useToast(); const cats = useCategories();
const month = ref(todayStr().slice(0, 7)); const s = ref(null); const loading = ref(true);
const txOpen = ref(false); const txType = ref('expense'); const catOpen = ref(false);
const bm = ref(false); const bcat = ref('overall'); const blimit = ref(''); const busy = ref(false);

async function load() {
  loading.value = true;
  try { s.value = (await api('/finance/summary', { params: { month: month.value, today: todayStr() } })).data; }
  catch (e) { toast.error(e.message); } finally { loading.value = false; }
}
onMounted(() => { cats.load().catch(() => {}); load(); });
watch(month, load);

const monthLabel = computed(() => new Date(`${month.value}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }));
const shortMonth = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short' });
function shift(n) {
  const [y, m] = month.value.split('-').map(Number); const d = new Date(y, m - 1 + n, 1);
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const atCurrent = computed(() => month.value >= todayStr().slice(0, 7));
const maxTrend = computed(() => Math.max(1, ...(s.value?.trend.flatMap((t) => [t.income, t.expense]) ?? [1])));
const maxDaily = computed(() => Math.max(1, ...(s.value?.daily.map((d) => d.expense) ?? [1])));
const maxDay = computed(() => Math.max(1, ...(s.value?.by_weekday.map((d) => d.total) ?? [1])));
const barColor = (p) => (p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-amber-500' : 'bg-emerald-500');
const rate = computed(() => (s.value?.income > 0 ? Math.round((s.value.balance / s.value.income) * 100) : null));
const donut = computed(() => {
  let a = 0;
  const parts = (s.value?.by_category ?? []).filter((c) => c.total > 0).map((c) => { const b = a + c.pct; const p = `${cats.color(c.category)} ${a}% ${b}%`; a = b; return p; });
  return parts.length ? `conic-gradient(${parts.join(',')})` : '#e2e8f0';
});
const budgetOptions = computed(() => [['overall', 'Overall monthly budget'], ...cats.names('expense').map((n) => [n, cap(n)])]);
const existing = computed(() => (bcat.value === 'overall' ? s.value?.overall_budget?.limit : s.value?.by_category.find((c) => c.category === bcat.value)?.budget) ?? null);
watch(bcat, () => { blimit.value = existing.value ?? ''; });

const openTx = (t) => { txType.value = t; txOpen.value = true; };
function openBudget(cat = 'overall') { bcat.value = cat; blimit.value = ''; bm.value = true; blimit.value = existing.value ?? ''; }
async function saveBudget() {
  const v = Number(blimit.value);
  if (!(v > 0)) return toast.error('Enter a budget greater than zero.');
  busy.value = true;
  try { await api('/budgets', { method: 'PUT', body: { category: bcat.value, monthly_limit: v } }); toast.success('Budget saved.'); bm.value = false; load(); }
  catch (e) { toast.error(e.details?.[0]?.message || e.message); } finally { busy.value = false; }
}
async function removeBudget() {
  busy.value = true;
  try { await api(`/budgets/${encodeURIComponent(bcat.value)}`, { method: 'DELETE' }); toast.success('Budget removed.'); bm.value = false; load(); }
  catch (e) { toast.error(e.message); } finally { busy.value = false; }
}
const alertText = (a) => {
  const n = a.category === 'overall' ? 'Monthly budget' : `${cap(a.category)} budget`;
  return a.level === 'over' ? `${n}: over by ${money(a.spent - a.limit)}` : `${n}: ${Math.round(a.used_pct)}% used, ${money(a.limit - a.spent)} left`;
};
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="flex items-center gap-2 text-2xl font-bold"><Wallet class="h-6 w-6 text-indigo-600" /> Finance</h1><p class="text-sm text-slate-500">Income, expenses, and where your money goes.</p></div>
      <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
        <button class="btn bg-emerald-600 text-white hover:bg-emerald-700" @click="openTx('income')"><Plus class="h-4 w-4" /> Income</button>
        <button class="btn-primary" @click="openTx('expense')"><Plus class="h-4 w-4" /> Expense</button>
        <RouterLink to="/app/transactions" class="btn-ghost"><List class="h-4 w-4" /> History</RouterLink>
        <button class="btn-ghost" @click="openBudget()"><Target class="h-4 w-4" /> Budget</button>
        <button class="btn-ghost col-span-2 sm:col-span-1" @click="catOpen = true"><Tags class="h-4 w-4" /> Categories</button>
      </div>
    </div>

    <div class="mb-5 flex items-center gap-2">
      <button class="btn-ghost !px-2" aria-label="Previous month" @click="shift(-1)"><ChevronLeft class="h-4 w-4" /></button>
      <span class="w-40 text-center font-semibold">{{ monthLabel }}</span>
      <button class="btn-ghost !px-2" aria-label="Next month" :disabled="atCurrent" @click="shift(1)"><ChevronRight class="h-4 w-4" /></button>
    </div>

    <p v-if="loading && !s" class="text-sm text-slate-500">Loading your finances…</p>
    <template v-else-if="s">
      <div v-if="s.alerts.length" class="mb-4 space-y-2">
        <button v-for="a in s.alerts" :key="a.id" class="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium"
          :class="a.level === 'over' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'" @click="openBudget(a.category)">
          <AlertTriangle class="h-4 w-4 shrink-0" />{{ alertText(a) }}
        </button>
      </div>

      <div class="mb-5 grid gap-4 sm:grid-cols-3">
        <div class="card"><p class="flex items-center gap-1 text-sm text-slate-500"><ArrowDownLeft class="h-4 w-4 text-emerald-600" /> Income</p><p class="text-2xl font-bold text-emerald-700">{{ money(s.income) }}</p><p class="mt-1 text-xs text-slate-500">last month {{ money(s.prev_income) }}</p></div>
        <div class="card"><p class="flex items-center gap-1 text-sm text-slate-500"><ArrowUpRight class="h-4 w-4 text-red-600" /> Expenses</p><p class="text-2xl font-bold text-red-700">{{ money(s.expense) }}</p><p class="mt-1 text-xs text-slate-500">last month {{ money(s.prev_expense) }}</p></div>
        <div class="card"><p class="flex items-center gap-1 text-sm text-slate-500"><Wallet class="h-4 w-4 text-indigo-600" /> Remaining balance</p><p :class="['text-2xl font-bold', s.balance < 0 ? 'text-red-700' : 'text-indigo-700']">{{ moneySigned(s.balance) }}</p><p class="mt-1 text-xs text-slate-500">{{ rate !== null ? `${rate}% of income kept` : 'income − expenses' }}</p></div>
      </div>

      <section class="card mb-5">
        <div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Monthly budget</h2><button class="text-sm font-medium text-indigo-600 hover:underline" @click="openBudget()">{{ s.overall_budget ? 'Edit' : 'Set budget' }}</button></div>
        <template v-if="s.overall_budget">
          <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2"><p class="text-sm"><b class="text-lg">{{ money(s.overall_budget.spent) }}</b> spent of {{ money(s.overall_budget.limit) }}</p><p :class="['text-sm font-semibold', s.overall_budget.level === 'over' ? 'text-red-600' : 'text-emerald-700']">{{ s.overall_budget.level === 'over' ? `${money(s.overall_budget.spent - s.overall_budget.limit)} over budget` : `${money(s.overall_budget.limit - s.overall_budget.spent)} left` }}</p></div>
          <div class="h-3 overflow-hidden rounded-full bg-slate-100"><div :class="['h-full rounded-full transition-all', barColor(s.overall_budget.used_pct)]" :style="{ width: Math.min(s.overall_budget.used_pct, 100) + '%' }" /></div>
          <p class="mt-1 text-xs text-slate-500">{{ Math.round(s.overall_budget.used_pct) }}% used · {{ s.days_in_month - s.days_elapsed }} days left in the month</p>
        </template>
        <p v-else class="text-sm text-slate-500">Set a monthly budget to see how much you've spent and how much is left. You can also set budgets per category below.</p>
      </section>

      <div v-if="!s.count && !s.by_category.length" class="card py-12 text-center">
        <Wallet class="mx-auto mb-3 h-10 w-10 text-slate-300" /><p class="font-medium">No transactions in {{ monthLabel }}</p>
        <p class="mb-4 mt-1 text-sm text-slate-500">Add your income and expenses to unlock charts and insights.</p>
        <div class="flex justify-center gap-2"><button class="btn bg-emerald-600 text-white" @click="openTx('income')">Add income</button><button class="btn-primary" @click="openTx('expense')">Add expense</button></div>
      </div>

      <template v-else>
        <section class="card mb-5">
          <h2 class="mb-3 flex items-center gap-2 font-semibold"><Lightbulb class="h-4 w-4 text-amber-500" /> Insights</h2>
          <ul class="space-y-2 text-sm"><li v-for="t in s.insights" :key="t" class="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900">{{ t }}</li></ul>
        </section>

        <div class="grid gap-5 lg:grid-cols-2">
          <section class="card">
            <h2 class="mb-4 font-semibold">Where your money goes</h2>
            <div v-if="s.expense > 0" class="mb-5 flex items-center gap-5">
              <div class="relative h-32 w-32 shrink-0 rounded-full" :style="{ background: donut }" role="img" :aria-label="`Expenses by category, total ${money(s.expense)}`"><div class="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center"><span class="text-[10px] text-slate-500">Spent</span><span class="text-sm font-bold">{{ money(s.expense) }}</span></div></div>
              <ul class="min-w-0 flex-1 space-y-1 text-xs"><li v-for="c in s.by_category.filter((x) => x.total > 0).slice(0, 5)" :key="c.category" class="flex items-center justify-between gap-2"><span class="flex items-center gap-2 truncate"><i class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: cats.color(c.category) }" />{{ cap(c.category) }}</span><span class="text-slate-500">{{ Math.round(c.pct) }}%</span></li></ul>
            </div>
            <ul class="space-y-4">
              <li v-for="c in s.by_category" :key="c.category">
                <div class="mb-1 flex items-center justify-between text-sm"><span class="flex items-center gap-2 font-medium"><i class="h-2.5 w-2.5 rounded-full" :style="{ background: cats.color(c.category) }" />{{ cap(c.category) }}</span><span>{{ money(c.total) }} <span class="text-xs text-slate-500">· {{ Math.round(c.pct) }}%</span></span></div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: c.pct + '%', background: cats.color(c.category) }" /></div>
                <div v-if="c.budget" class="mt-2">
                  <div class="mb-1 flex justify-between text-xs" :class="c.used_pct >= 100 ? 'text-red-600' : 'text-slate-500'"><span>Budget {{ money(c.budget) }}</span><span>{{ c.used_pct >= 100 ? `${money(c.total - c.budget)} over` : `${money(c.budget - c.total)} left` }}</span></div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-slate-100"><div :class="['h-full rounded-full', barColor(c.used_pct)]" :style="{ width: Math.min(c.used_pct, 100) + '%' }" /></div>
                </div>
                <button class="mt-1 text-xs font-medium text-indigo-600 hover:underline" @click="openBudget(c.category)">{{ c.budget ? 'Edit budget' : 'Set a budget' }}</button>
              </li>
            </ul>
          </section>

          <div class="space-y-5">
            <section class="card">
              <div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Income vs expenses</h2><span class="flex gap-3 text-xs text-slate-500"><span class="flex items-center gap-1"><i class="h-2 w-2 rounded-full bg-emerald-500" />Income</span><span class="flex items-center gap-1"><i class="h-2 w-2 rounded-full bg-indigo-500" />Expenses</span></span></div>
              <div class="flex h-40 items-end gap-3">
                <div v-for="t in s.trend" :key="t.month" class="flex flex-1 flex-col items-center justify-end gap-1" :title="`${shortMonth(t.month)}: income ${money(t.income)}, expenses ${money(t.expense)}`">
                  <div class="flex h-32 w-full items-end justify-center gap-0.5"><div class="w-1/2 rounded-t bg-emerald-500" :style="{ height: Math.max((t.income / maxTrend) * 100, t.income ? 3 : 0) + '%' }" /><div class="w-1/2 rounded-t bg-indigo-500" :style="{ height: Math.max((t.expense / maxTrend) * 100, t.expense ? 3 : 0) + '%' }" /></div>
                  <span :class="['text-xs', t.month === month ? 'font-bold text-indigo-700' : 'text-slate-500']">{{ shortMonth(t.month) }}</span>
                </div>
              </div>
            </section>

            <section class="card">
              <h2 class="mb-4 font-semibold">Daily spending</h2>
              <div class="flex h-24 items-end gap-px"><div v-for="d in s.daily" :key="d.day" class="flex-1 rounded-t bg-violet-400/80" :style="{ height: Math.max((d.expense / maxDaily) * 100, d.expense ? 4 : 1) + '%', opacity: d.expense ? 1 : 0.25 }" :title="`Day ${d.day}: ${money(d.expense)}`" /></div>
              <div class="mt-1 flex justify-between text-[10px] text-slate-500"><span>1</span><span>{{ Math.ceil(s.days_in_month / 2) }}</span><span>{{ s.days_in_month }}</span></div>
            </section>

            <section class="card">
              <h2 class="mb-4 font-semibold">Spending by weekday</h2>
              <div class="flex h-24 items-end gap-2"><div v-for="d in s.by_weekday" :key="d.day" class="flex flex-1 flex-col items-center justify-end gap-1" :title="`${d.day}: ${money(d.total)}`"><div class="w-full rounded-t bg-indigo-400/80" :style="{ height: Math.max((d.total / maxDay) * 100, d.total ? 4 : 1) + '%' }" /><span class="text-xs text-slate-500">{{ d.day.slice(0, 3) }}</span></div></div>
            </section>

            <section v-if="s.income_by_category.length" class="card">
              <h2 class="mb-3 font-semibold">Income sources</h2>
              <ul class="space-y-2 text-sm"><li v-for="c in s.income_by_category" :key="c.category" class="flex items-center justify-between"><span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" :style="{ background: cats.color(c.category) }" />{{ cap(c.category) }}</span><span class="font-medium text-emerald-700">{{ money(c.total) }} <span class="text-xs text-slate-500">· {{ Math.round(c.pct) }}%</span></span></li></ul>
            </section>

            <section v-if="s.top_expenses.length" class="card">
              <h2 class="mb-3 font-semibold">Biggest expenses</h2>
              <ul class="divide-y text-sm"><li v-for="e in s.top_expenses" :key="e.id" class="flex items-center justify-between py-2"><span class="min-w-0"><span class="block truncate font-medium">{{ e.description || cap(e.category) }}</span><span class="text-xs text-slate-500">{{ cap(e.category) }} · {{ fmtDate(e.spent_on) }}</span></span><span class="font-semibold">{{ money(e.amount) }}</span></li></ul>
            </section>
          </div>
        </div>
      </template>
    </template>

    <TransactionForm :open="txOpen" :type="txType" @close="txOpen = false" @saved="load" />
    <CategoryManager :open="catOpen" @close="catOpen = false" @changed="load" />

    <BaseModal :open="bm" title="Monthly budget" @close="bm = false">
      <form class="space-y-4" @submit.prevent="saveBudget">
        <div><label class="label" for="b-cat">Budget for</label><select id="b-cat" v-model="bcat" class="input"><option v-for="[v, l] in budgetOptions" :key="v" :value="v">{{ l }}</option></select></div>
        <div><label class="label" for="b-lim">Monthly limit (₱)</label><input id="b-lim" v-model="blimit" type="number" min="1" step="0.01" inputmode="decimal" class="input" placeholder="e.g. 15000" /></div>
        <p class="text-xs text-slate-500">You'll get an alert at 80% and again when you go over.</p>
        <div class="flex justify-between gap-2">
          <button v-if="existing" type="button" class="btn-ghost text-red-600" :disabled="busy" @click="removeBudget">Remove</button><span v-else />
          <div class="flex gap-2"><button type="button" class="btn-ghost" @click="bm = false">Cancel</button><button class="btn-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save budget' }}</button></div>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
