<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, SlidersHorizontal, ChevronRight, Folder } from 'lucide-vue-next';
import BaseModal from '../BaseModal.vue';
import LbHeader from './LbHeader.vue';
import { useLifeBox } from '../../stores/lifeboxStore';
import { fmtDate } from '../../lib/format';
import { DOC_CATEGORIES, catOf, expiryStatus, STATE_STYLE, fmtSize } from '../../lib/lifebox';
import { iconOf } from '../../lib/lbIcons';

const lb = useLifeBox(); const route = useRoute(); const router = useRouter();
const q = ref(''); const status = ref(''); const sort = ref('recent'); const filterOpen = ref(false);
const cat = computed(() => (DOC_CATEGORIES.some((c) => c.key === route.query.c) ? route.query.c : ''));
const setCat = (c) => router.replace({ query: c ? { c } : {} });

const counts = computed(() => Object.fromEntries(DOC_CATEGORIES.map((c) => [c.key, lb.docs.filter((d) => (d.category || 'other') === c.key).length])));
const filtering = computed(() => !!(q.value.trim() || cat.value || status.value));
const list = computed(() => {
  const t = q.value.trim().toLowerCase();
  let out = lb.docs.map((d) => ({ ...d, category: d.category || 'other', st: expiryStatus(d.expires_on, d.renewal_remind_days) }));
  if (cat.value) out = out.filter((d) => d.category === cat.value);
  if (t) out = out.filter((d) => [d.name, d.reference_notes, d.document_number, d.file_name, catOf(d.category).label].some((v) => v && String(v).toLowerCase().includes(t)));
  if (status.value === 'file') out = out.filter((d) => d.file_path); else if (status.value === 'nofile') out = out.filter((d) => !d.file_path); else if (status.value) out = out.filter((d) => d.st.state === status.value);
  const by = { recent: (a, b) => b.created_at.localeCompare(a.created_at), name: (a, b) => a.name.localeCompare(b.name), expiry: (a, b) => (a.expires_on || '9999').localeCompare(b.expires_on || '9999') };
  return out.sort(by[sort.value]);
});
const reset = () => { q.value = ''; status.value = ''; sort.value = 'recent'; setCat(''); filterOpen.value = false; };
</script>

<template>
  <div>
    <LbHeader :title="cat ? catOf(cat).label : 'My Documents'">
      <button class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50" :class="status || sort !== 'recent' ? 'border-indigo-400 text-indigo-600' : ''" aria-label="Filter and sort" @click="filterOpen = true"><SlidersHorizontal class="h-5 w-5" /></button>
    </LbHeader>

    <div class="relative mb-3"><Search class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input v-model="q" class="input pl-10" placeholder="Search documents…" aria-label="Search documents" /></div>
    <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Category filter">
      <button :class="['min-h-[36px] shrink-0 rounded-full border px-4 text-sm font-medium', !cat ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700']" :aria-pressed="!cat" @click="setCat('')">All</button>
      <button v-for="c in DOC_CATEGORIES" :key="c.key" :class="['min-h-[36px] shrink-0 rounded-full border px-4 text-sm font-medium', cat === c.key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700']" :aria-pressed="cat === c.key" @click="setCat(c.key)">{{ c.chip }}</button>
    </div>

    <ul v-if="!filtering" class="card divide-y !p-0">
      <li v-for="c in DOC_CATEGORIES" :key="c.key"><button class="flex min-h-[64px] w-full items-center gap-3 p-3 text-left hover:bg-slate-50" @click="setCat(c.key)"><Folder class="h-9 w-9 shrink-0" :style="{ color: c.color }" fill="currentColor" fill-opacity=".18" /><span class="min-w-0 flex-1"><span class="block font-medium">{{ c.label }}</span><span class="text-xs text-slate-500">{{ counts[c.key] }} file{{ counts[c.key] === 1 ? '' : 's' }}</span></span><ChevronRight class="h-4 w-4 text-slate-400" /></button></li>
    </ul>

    <template v-else>
      <div v-if="!list.length" class="card py-12 text-center"><p class="font-medium">{{ cat && !lb.docs.some((d) => (d.category || 'other') === cat) ? 'This folder is empty' : 'No documents match' }}</p><p class="mb-4 mt-1 text-sm text-slate-500">Upload one or adjust your search and filters.</p><div class="flex justify-center gap-2"><button class="btn-ghost" @click="reset">Clear filters</button><RouterLink :to="`/app/lifebox/upload${cat ? `?c=${cat}` : ''}`" class="btn-primary">Upload</RouterLink></div></div>
      <ul v-else class="card divide-y !p-0">
        <li v-for="d in list" :key="d.id"><RouterLink :to="`/app/lifebox/view/${d.id}`" class="flex min-h-[64px] items-center gap-3 p-3 hover:bg-slate-50"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" :style="{ background: catOf(d.category).color }"><component :is="iconOf(d.category)" class="h-5 w-5" /></span><span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ d.name }}</span><span class="block truncate text-xs text-slate-500">{{ catOf(d.category).single }}{{ d.file_size ? ` · ${fmtSize(d.file_size)}` : d.file_path ? '' : ' · no file' }}</span></span><span class="flex shrink-0 flex-col items-end gap-1"><span v-if="d.expires_on" :class="['badge', STATE_STYLE[d.st.state]]">{{ d.st.state === 'expired' ? 'Expired' : d.st.state === 'soon' ? 'Due soon' : fmtDate(d.expires_on) }}</span><ChevronRight v-else class="h-4 w-4 text-slate-400" /></span></RouterLink></li>
      </ul>
    </template>

    <BaseModal :open="filterOpen" title="Filter & sort" @close="filterOpen = false">
      <div class="space-y-4">
        <div><label class="label" for="df-status">Status</label><select id="df-status" v-model="status" class="input"><option value="">Any</option><option value="valid">Active</option><option value="soon">Due soon</option><option value="expired">Expired</option><option value="none">No expiry date</option><option value="file">Has a file</option><option value="nofile">No file attached</option></select></div>
        <div><label class="label" for="df-sort">Sort by</label><select id="df-sort" v-model="sort" class="input"><option value="recent">Newest first</option><option value="name">Name A–Z</option><option value="expiry">Expiry date</option></select></div>
        <div class="flex justify-between gap-2"><button class="btn-ghost" @click="reset">Reset</button><button class="btn-primary" @click="filterOpen = false">Apply</button></div>
      </div>
    </BaseModal>
  </div>
</template>
