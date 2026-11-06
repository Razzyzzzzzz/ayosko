<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, Pencil, Trash2, Paperclip, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next';
import BaseModal from '../components/BaseModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import BillsCharts from '../components/BillsCharts.vue';
import { api } from '../lib/api';
import { RESOURCES } from '../lib/resources';
import { fmtDate, fmtDateTime, money, toLocalInput, fromLocalInput, todayStr, cap } from '../lib/format';
import { useToast } from '../stores/toast';

const props = defineProps({ resource: String });
const cfg = RESOURCES[props.resource];
const isBills = props.resource === 'bills';
const route = useRoute(); const router = useRouter(); const toast = useToast();

const rows = ref([]); const loading = ref(true);
const allRows = ref([]); // lahat ng bills (hindi apektado ng search/filter) para sa charts
const search = ref(''); const filter = ref(''); const sort = ref(cfg.sort); const dir = ref('asc');
const modal = ref(false); const editing = ref(null); const form = reactive({}); const saving = ref(false);
const errors = ref([]); const delRow = ref(null); const file = ref(null);

async function load() {
  loading.value = true;
  try {
    const params = { search: search.value, sort: sort.value, dir: dir.value };
    if (cfg.filter) params[cfg.filter.key] = filter.value;
    rows.value = (await api(cfg.endpoint, { params })).data;
    if (isBills) allRows.value = (await api(cfg.endpoint, { params: { sort: 'due_date', dir: 'asc' } })).data;
  } catch (e) { toast.error(e.message); } finally { loading.value = false; }
}
let t; watch(search, () => { clearTimeout(t); t = setTimeout(load, 300); });
watch([filter, sort, dir], load);
onMounted(() => { load(); if (route.query.new) openForm(); });
watch(() => route.query.new, (v) => v && openForm());

function openForm(row = null) {
  editing.value = row; errors.value = []; file.value = null;
  for (const f of cfg.fields) {
    const v = row?.[f.key] ?? f.default ?? '';
    form[f.key] = f.type === 'datetime' ? toLocalInput(v) : v;
  }
  modal.value = true;
  if (route.query.new) router.replace({ query: {} });
}

function payload() {
  const out = {};
  for (const f of cfg.fields) {
    const v = form[f.key];
    if (f.type === 'number') out[f.key] = v === '' ? undefined : Number(v);
    else if (f.type === 'datetime') out[f.key] = fromLocalInput(v);
    else if (f.type === 'select') out[f.key] = v;
    else out[f.key] = v === '' ? (f.required ? '' : null) : v;
  }
  return out;
}

async function save() {
  errors.value = [];
  for (const f of cfg.fields) if (f.required && !form[f.key]) return (errors.value = [{ message: `${cap(f.key)} is required.` }]);
  saving.value = true;
  try {
    const body = payload();
    const res = editing.value
      ? await api(`${cfg.endpoint}/${editing.value.id}`, { method: 'PATCH', body })
      : await api(cfg.endpoint, { method: 'POST', body });
    if (cfg.files && file.value) {
      const fd = new FormData(); fd.append('file', file.value);
      await api(`${cfg.endpoint}/${res.data.id}/file`, { method: 'POST', form: fd });
    }
    toast.success(editing.value ? 'Saved.' : 'Created.');
    modal.value = false; load();
  } catch (e) { errors.value = e.details?.length ? e.details : [{ message: e.message }]; } finally { saving.value = false; }
}

async function toggle(row) {
  const tg = cfg.toggle; const isOn = row[tg.field] === tg.on;
  try { await api(`${cfg.endpoint}/${row.id}`, { method: 'PATCH', body: { [tg.field]: isOn ? tg.off : tg.on } }); load(); }
  catch (e) { toast.error(e.message); }
}

async function remove() {
  try { await api(`${cfg.endpoint}/${delRow.value.id}`, { method: 'DELETE' }); toast.success('Deleted.'); delRow.value = null; load(); }
  catch (e) { toast.error(e.message); }
}

async function openFile(row) {
  try { window.open((await api(`${cfg.endpoint}/${row.id}/file`)).data.url, '_blank', 'noopener'); }
  catch (e) { toast.error(e.message); }
}

const overdue = (r) => cfg.dueKey && r[cfg.dueKey] && r[cfg.dueKey] < todayStr() && !(cfg.done?.(r));
const sortBy = (k) => { if (sort.value === k) dir.value = dir.value === 'asc' ? 'desc' : 'asc'; else { sort.value = k; dir.value = 'asc'; } };
const badge = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600', paid: 'bg-emerald-100 text-emerald-700', unpaid: 'bg-amber-100 text-amber-700' };
function cell(c, r) {
  const v = r[c.key];
  if (v == null || v === '') return '—';
  return c.type === 'date' ? fmtDate(v) : c.type === 'datetime' ? fmtDateTime(v) : c.type === 'money' ? money(v) : v;
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ cfg.title }}</h1>
      <button class="btn-primary shrink-0" @click="openForm()"><Plus class="h-4 w-4" /> New {{ cfg.singular }}</button>
    </div>

    <!-- Charts (Bills lang) -->
    <BillsCharts v-if="isBills && allRows.length" :bills="allRows" />

    <!-- Search, filter, sort -->
    <div class="mb-4 flex flex-col gap-2 sm:flex-row">
      <div class="relative sm:flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input v-model="search" type="search" class="input pl-9" :placeholder="`Search ${cfg.title.toLowerCase()}…`" aria-label="Search" />
      </div>
      <div class="flex gap-2">
        <select v-if="cfg.filter" v-model="filter" class="input min-w-0 flex-1 sm:w-auto sm:flex-none" aria-label="Filter">
          <option value="">{{ cfg.filter.label }}</option><option v-for="[v, l] in cfg.filter.options" :key="v" :value="v">{{ l }}</option>
        </select>
        <!-- Sort control para sa mobile (wala kasing table header doon) -->
        <select v-model="sort" class="input min-w-0 flex-1 md:hidden" aria-label="Sort by">
          <option v-for="c in cfg.columns" :key="c.key" :value="c.key">Sort: {{ c.label }}</option>
        </select>
        <button type="button" class="btn-ghost h-10 w-10 shrink-0 !p-0 md:hidden" :aria-label="dir === 'asc' ? 'Sorted ascending, tap to reverse' : 'Sorted descending, tap to reverse'" @click="dir = dir === 'asc' ? 'desc' : 'asc'">
          <ArrowUp v-if="dir === 'asc'" class="h-4 w-4" /><ArrowDown v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3" aria-busy="true" aria-label="Loading">
      <div v-for="n in 4" :key="n" class="card p-4"><div class="h-4 w-1/2 animate-pulse rounded bg-slate-200" /><div class="mt-3 h-3 w-3/4 animate-pulse rounded bg-slate-100" /></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!rows.length" class="card p-8 text-center sm:p-10">
      <p class="font-medium">Nothing here yet</p>
      <p class="mb-4 mt-1 text-sm text-slate-500">{{ search || filter ? 'No results match your filters.' : `Add your first ${cfg.singular} to get started.` }}</p>
      <button v-if="!search && !filter" class="btn-primary" @click="openForm()"><Plus class="h-4 w-4" /> New {{ cfg.singular }}</button>
    </div>

    <template v-else>
      <!-- Desktop / tablet: table -->
      <div class="card hidden overflow-x-auto p-0 md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th v-for="c in cfg.columns" :key="c.key" class="whitespace-nowrap px-4 py-3">
                <button class="inline-flex items-center gap-1 uppercase" @click="sortBy(c.key)">{{ c.label }}<ArrowUpDown class="h-3 w-3" /></button>
              </th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50" :class="{ 'opacity-60': cfg.done?.(r) }">
              <td v-for="c in cfg.columns" :key="c.key" class="px-4 py-3" :class="{ 'font-medium': c === cfg.columns[0], 'text-red-600': overdue(r) && c.key === cfg.dueKey }">
                <span v-if="c.type === 'badge'" :class="['badge', badge[r[c.key]] || 'bg-slate-100']">{{ r[c.key] }}</span>
                <span v-else :class="{ 'line-through': cfg.done?.(r) && c === cfg.columns[0] }">{{ cell(c, r) }}</span>
                <span v-if="overdue(r) && c.key === cfg.dueKey" class="ml-1 text-xs">(overdue)</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <button v-if="cfg.toggle" class="btn-ghost mr-1 !px-2 !py-1 text-xs" @click="toggle(r)">{{ r[cfg.toggle.field] === cfg.toggle.on ? cfg.toggle.offLabel : cfg.toggle.onLabel }}</button>
                <button v-if="cfg.files && r.file_path" class="rounded p-1.5 hover:bg-slate-200" aria-label="Open file" @click="openFile(r)"><Download class="h-4 w-4" /></button>
                <button class="rounded p-1.5 hover:bg-slate-200" aria-label="Edit" @click="openForm(r)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" @click="delRow = r"><Trash2 class="h-4 w-4" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: cards -->
      <ul class="space-y-3 md:hidden">
        <li v-for="r in rows" :key="r.id" class="card p-4" :class="{ 'opacity-60': cfg.done?.(r) }">
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 break-words font-semibold" :class="{ 'line-through': cfg.done?.(r) }">{{ cell(cfg.columns[0], r) }}</p>
            <span v-if="overdue(r)" class="badge shrink-0 bg-red-100 text-red-700">Overdue</span>
          </div>
          <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div v-for="c in cfg.columns.slice(1)" :key="c.key" class="min-w-0">
              <dt class="text-xs text-slate-500">{{ c.label }}</dt>
              <dd class="break-words" :class="{ 'text-red-600': overdue(r) && c.key === cfg.dueKey }">
                <span v-if="c.type === 'badge' && r[c.key]" :class="['badge', badge[r[c.key]] || 'bg-slate-100']">{{ r[c.key] }}</span>
                <template v-else>{{ cell(c, r) }}</template>
              </dd>
            </div>
          </dl>
          <div class="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
            <button v-if="cfg.toggle" class="btn-ghost mr-auto !px-3 !py-1.5 text-xs" @click="toggle(r)">{{ r[cfg.toggle.field] === cfg.toggle.on ? cfg.toggle.offLabel : cfg.toggle.onLabel }}</button>
            <span v-else class="mr-auto" />
            <button v-if="cfg.files && r.file_path" class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Open file" @click="openFile(r)"><Download class="h-4 w-4" /></button>
            <button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Edit" @click="openForm(r)"><Pencil class="h-4 w-4" /></button>
            <button class="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Delete" @click="delRow = r"><Trash2 class="h-4 w-4" /></button>
          </div>
        </li>
      </ul>
    </template>

    <BaseModal :open="modal" :title="`${editing ? 'Edit' : 'New'} ${cfg.singular}`" @close="modal = false">
      <form class="space-y-4" novalidate @submit.prevent="save">
        <div v-for="f in cfg.fields" :key="f.key">
          <label class="label" :for="f.key">{{ cap(f.key) }}<span v-if="f.required" class="text-red-500"> *</span></label>
          <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="form[f.key]" rows="3" class="input" />
          <select v-else-if="f.type === 'select'" :id="f.key" v-model="form[f.key]" class="input"><option v-for="o in f.options" :key="o" :value="o">{{ cap(o) }}</option></select>
          <input v-else :id="f.key" v-model="form[f.key]" class="input" :type="f.type === 'datetime' ? 'datetime-local' : f.type" :step="f.type === 'number' && !f.int ? '0.01' : undefined" :min="f.type === 'number' ? 0 : undefined" :inputmode="f.type === 'number' ? 'decimal' : undefined" />
        </div>
        <div v-if="cfg.files">
          <label class="label" for="attachment"><Paperclip class="mr-1 inline h-4 w-4" />Private attachment (PDF/JPG/PNG/WEBP, max 5 MB)</label>
          <input id="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp" class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" @change="file = $event.target.files[0]" />
          <p v-if="editing?.file_name" class="mt-1 text-xs text-slate-500">Current: {{ editing.file_name }} (uploading replaces it)</p>
        </div>
        <ul v-if="errors.length" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert"><li v-for="(e, i) in errors" :key="i">{{ e.field ? cap(e.field) + ': ' : '' }}{{ e.message }}</li></ul>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn-ghost w-full sm:w-auto" @click="modal = false">Cancel</button>
          <button class="btn-primary w-full sm:w-auto" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </BaseModal>

    <ConfirmDialog :open="!!delRow" :message="`Delete this ${cfg.singular}? This cannot be undone.`" @cancel="delRow = null" @confirm="remove" />
  </div>
</template>