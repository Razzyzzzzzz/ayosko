<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, Pencil, Trash2, Tags, ArrowUpDown } from 'lucide-vue-next';
import TransactionForm from '../components/TransactionForm.vue';
import CategoryManager from '../components/CategoryManager.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { api } from '../lib/api';
import { useCategories } from '../stores/categories';
import { money, moneySigned, fmtDate, todayStr, cap } from '../lib/format';
import { useToast } from '../stores/toast';

const route = useRoute(); const router = useRouter(); const toast = useToast(); const cats = useCategories();
const filters = reactive({ search: '', type: '', category: '', from: '', to: '' });
const sort = ref('spent_on'); const dir = ref('desc');
const rows = ref([]); const meta = ref({ total: 0, income: 0, expense: 0 });
const loading = ref(true); const loadingMore = ref(false);
const txOpen = ref(false); const txType = ref('expense'); const editing = ref(null); const catOpen = ref(false); const delRow = ref(null);

async function load(reset = true) {
  reset ? (loading.value = true) : (loadingMore.value = true);
  try {
    const res = await api('/transactions', { params: { ...filters, sort: sort.value, dir: dir.value, limit: 50, offset: reset ? 0 : rows.value.length } });
    rows.value = reset ? res.data : [...rows.value, ...res.data]; meta.value = res.meta;
  } catch (e) { toast.error(e.message); } finally { loading.value = false; loadingMore.value = false; }
}
let t; watch(() => filters.search, () => { clearTimeout(t); t = setTimeout(() => load(), 300); });
watch([() => filters.type, () => filters.category, () => filters.from, () => filters.to, sort, dir], () => load());

const catOptions = computed(() => [...new Set(filters.type ? cats.names(filters.type) : [...cats.names('expense'), ...cats.names('income')])]);
watch(() => filters.type, () => { if (filters.category && !catOptions.value.includes(filters.category)) filters.category = ''; });

function openForm(type = 'expense', row = null) { editing.value = row; txType.value = type; txOpen.value = true; }
const fromQuery = () => { const v = String(route.query.new || ''); if (v) { openForm(v.startsWith('income') ? 'income' : 'expense'); router.replace({ query: {} }); } };
onMounted(() => { cats.load().catch(() => {}); load(); fromQuery(); });
watch(() => route.query.new, (v) => v && fromQuery());

async function remove() {
  try { await api(`/transactions/${delRow.value.id}`, { method: 'DELETE' }); toast.success('Deleted.'); delRow.value = null; load(); }
  catch (e) { toast.error(e.message); }
}
function thisMonth() {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0');
  filters.from = `${y}-${m}-01`; filters.to = `${y}-${m}-${String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
}
const clear = () => Object.assign(filters, { search: '', type: '', category: '', from: '', to: '' });
const hasFilters = computed(() => Object.values(filters).some(Boolean));
const sortBy = (k) => { if (sort.value === k) dir.value = dir.value === 'asc' ? 'desc' : 'asc'; else { sort.value = k; dir.value = 'desc'; } };
const amount = (r) => (r.type === 'income' ? `+${money(r.amount)}` : `−${money(r.amount)}`);
const amountClass = (r) => (r.type === 'income' ? 'text-emerald-700' : 'text-red-700');
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Transactions</h1>
      <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <button class="btn bg-emerald-600 text-white hover:bg-emerald-700" @click="openForm('income')"><Plus class="h-4 w-4" /> Income</button>
        <button class="btn-primary" @click="openForm('expense')"><Plus class="h-4 w-4" /> Expense</button>
        <button class="btn-ghost col-span-2 sm:col-span-1" @click="catOpen = true"><Tags class="h-4 w-4" /> Categories</button>
      </div>
    </div>

    <section class="card mb-4 space-y-3">
      <div class="relative"><Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input v-model="filters.search" class="input pl-9" placeholder="Search description or category…" aria-label="Search transactions" /></div>
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div><label class="label" for="f-type">Type</label><select id="f-type" v-model="filters.type" class="input"><option value="">All</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
        <div><label class="label" for="f-cat">Category</label><select id="f-cat" v-model="filters.category" class="input"><option value="">All</option><option v-for="c in catOptions" :key="c" :value="c">{{ cap(c) }}</option></select></div>
        <div><label class="label" for="f-from">From</label><input id="f-from" v-model="filters.from" type="date" class="input" /></div>
        <div><label class="label" for="f-to">To</label><input id="f-to" v-model="filters.to" type="date" class="input" /></div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn-ghost !min-h-0 !py-1.5 text-xs" @click="thisMonth">This month</button>
        <button v-if="hasFilters" class="btn-ghost !min-h-0 !py-1.5 text-xs" @click="clear">Clear filters</button>
        <div class="ml-auto flex gap-2 md:hidden">
          <select class="input w-auto !py-1.5" :value="sort" aria-label="Sort by" @change="sort = $event.target.value"><option value="spent_on">Sort: Date</option><option value="amount">Sort: Amount</option><option value="category">Sort: Category</option></select>
          <button class="btn-ghost !px-3" aria-label="Toggle direction" @click="dir = dir === 'asc' ? 'desc' : 'asc'">{{ dir === 'asc' ? '↑' : '↓' }}</button>
        </div>
      </div>
    </section>

    <div class="mb-4 grid grid-cols-3 gap-3 text-center">
      <div class="card !p-3"><p class="text-xs text-slate-500">Income</p><p class="text-sm font-bold text-emerald-700 sm:text-base">{{ money(meta.income) }}</p></div>
      <div class="card !p-3"><p class="text-xs text-slate-500">Expenses</p><p class="text-sm font-bold text-red-700 sm:text-base">{{ money(meta.expense) }}</p></div>
      <div class="card !p-3"><p class="text-xs text-slate-500">Net · {{ meta.total }} items</p><p :class="['text-sm font-bold sm:text-base', meta.income - meta.expense < 0 ? 'text-red-700' : 'text-indigo-700']">{{ moneySigned(meta.income - meta.expense) }}</p></div>
    </div>

    <div class="card overflow-x-auto p-0">
      <p v-if="loading" class="p-8 text-center text-sm text-slate-500">Loading…</p>
      <div v-else-if="!rows.length" class="p-10 text-center">
        <p class="font-medium">{{ hasFilters ? 'No transactions match your filters' : 'No transactions yet' }}</p>
        <p class="mb-4 mt-1 text-sm text-slate-500">{{ hasFilters ? 'Try a different date range or category.' : 'Add your first income or expense to get started.' }}</p>
        <button v-if="hasFilters" class="btn-ghost" @click="clear">Clear filters</button>
        <div v-else class="flex justify-center gap-2"><button class="btn bg-emerald-600 text-white" @click="openForm('income')">Add income</button><button class="btn-primary" @click="openForm('expense')">Add expense</button></div>
      </div>
      <template v-else>
        <table class="hidden w-full text-left text-sm md:table">
          <thead class="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3"><button class="inline-flex items-center gap-1 uppercase" @click="sortBy('spent_on')">Date<ArrowUpDown class="h-3 w-3" /></button></th>
              <th class="px-4 py-3">Description</th>
              <th class="px-4 py-3"><button class="inline-flex items-center gap-1 uppercase" @click="sortBy('category')">Category<ArrowUpDown class="h-3 w-3" /></button></th>
              <th class="px-4 py-3">Via</th>
              <th class="px-4 py-3 text-right"><button class="inline-flex items-center gap-1 uppercase" @click="sortBy('amount')">Amount<ArrowUpDown class="h-3 w-3" /></button></th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-3">{{ fmtDate(r.spent_on) }}</td>
              <td class="px-4 py-3 font-medium">{{ r.description || '—' }}</td>
              <td class="px-4 py-3"><span class="inline-flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" :style="{ background: cats.color(r.category) }" />{{ cap(r.category) }}</span></td>
              <td class="px-4 py-3 text-slate-500">{{ cap(r.payment_method) }}</td>
              <td :class="['whitespace-nowrap px-4 py-3 text-right font-semibold', amountClass(r)]">{{ amount(r) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right"><button class="rounded p-1.5 hover:bg-slate-200" aria-label="Edit" @click="openForm(r.type, r)"><Pencil class="h-4 w-4" /></button><button class="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" @click="delRow = r"><Trash2 class="h-4 w-4" /></button></td>
            </tr>
          </tbody>
        </table>

        <ul class="divide-y md:hidden">
          <li v-for="r in rows" :key="r.id" class="p-4">
            <div class="flex items-start justify-between gap-3"><p class="break-words font-semibold">{{ r.description || cap(r.category) }}</p><p :class="['shrink-0 font-bold', amountClass(r)]">{{ amount(r) }}</p></div>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500"><span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full" :style="{ background: cats.color(r.category) }" />{{ cap(r.category) }}</span><span>{{ fmtDate(r.spent_on) }}</span><span>{{ cap(r.payment_method) }}</span></p>
            <div class="mt-3 flex gap-2"><button class="btn-ghost flex-1" @click="openForm(r.type, r)"><Pencil class="h-4 w-4" /> Edit</button><button class="btn-ghost !px-3 text-red-600" aria-label="Delete" @click="delRow = r"><Trash2 class="h-4 w-4" /></button></div>
          </li>
        </ul>
        <div v-if="rows.length < meta.total" class="border-t p-4 text-center"><button class="btn-ghost" :disabled="loadingMore" @click="load(false)">{{ loadingMore ? 'Loading…' : `Load more (${meta.total - rows.length} left)` }}</button></div>
      </template>
    </div>

    <TransactionForm :open="txOpen" :tx="editing" :type="txType" @close="txOpen = false" @saved="load()" />
    <CategoryManager :open="catOpen" @close="catOpen = false" @changed="load()" />
    <ConfirmDialog :open="!!delRow" message="Delete this transaction? This cannot be undone." @cancel="delRow = null" @confirm="remove" />
  </div>
</template>
