<script setup>
import { ref, watch } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import BaseModal from './BaseModal.vue';
import { api } from '../lib/api';
import { useCategories } from '../stores/categories';
import { useToast } from '../stores/toast';
import { cap } from '../lib/format';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close', 'changed']);
const cats = useCategories(); const toast = useToast();
const tab = ref('expense'); const name = ref(''); const color = ref('#6366f1'); const busy = ref(false);

watch(() => props.open, (o) => o && cats.load().catch((e) => toast.error(e.message)));

async function add() {
  if (!name.value.trim()) return toast.error('Enter a category name.');
  busy.value = true;
  try {
    await api('/categories', { method: 'POST', body: { name: name.value.trim(), type: tab.value, color: color.value } });
    name.value = ''; await cats.load(true); emit('changed'); toast.success('Category added.');
  } catch (e) { toast.error(e.details?.[0]?.message || e.message); } finally { busy.value = false; }
}
async function remove(c) {
  busy.value = true;
  try { await api(`/categories/${c.id}`, { method: 'DELETE' }); await cats.load(true); emit('changed'); toast.success('Category deleted.'); }
  catch (e) { toast.error(e.message); } finally { busy.value = false; }
}
</script>

<template>
  <BaseModal :open="open" title="Manage categories" @close="emit('close')">
    <div class="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Category type">
      <button v-for="t in ['expense', 'income']" :key="t" type="button" :aria-pressed="tab === t" :class="['min-h-[44px] rounded-lg text-sm font-semibold', tab === t ? 'bg-white text-indigo-700 shadow' : 'text-slate-600']" @click="tab = t">{{ cap(t) }}</button>
    </div>
    <ul class="mb-4 max-h-64 divide-y overflow-y-auto rounded-lg border">
      <li v-for="c in cats.data[tab]" :key="c.name" class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
        <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full" :style="{ background: c.color }" />{{ cap(c.name) }}<span v-if="!c.custom" class="text-xs text-slate-500">default</span></span>
        <button v-if="c.custom" class="rounded p-2 text-red-600 hover:bg-red-50" :aria-label="`Delete ${c.name}`" :disabled="busy" @click="remove(c)"><Trash2 class="h-4 w-4" /></button>
      </li>
    </ul>
    <form class="flex items-end gap-2" @submit.prevent="add">
      <div class="min-w-0 flex-1"><label class="label" for="cat-name">New {{ tab }} category</label><input id="cat-name" v-model="name" class="input" maxlength="30" placeholder="e.g. Pets, Load, Tithes" /></div>
      <div><label class="label" for="cat-color">Color</label><input id="cat-color" v-model="color" type="color" class="h-[44px] w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" /></div>
      <button class="btn-primary" :disabled="busy">Add</button>
    </form>
  </BaseModal>
</template>
