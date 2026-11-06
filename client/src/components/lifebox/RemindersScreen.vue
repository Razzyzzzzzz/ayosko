<script setup>
import { ref, computed } from 'vue';
import { ChevronRight, BellOff } from 'lucide-vue-next';
import LbHeader from './LbHeader.vue';
import { useLifeBox } from '../../stores/lifeboxStore';
import { fmtDate } from '../../lib/format';
import { dateItems, catOf } from '../../lib/lifebox';
import { iconOf } from '../../lib/lbIcons';

const lb = useLifeBox(); const tab = ref('upcoming');
const items = computed(() => dateItems(lb.docs, lb.reminders));
const matches = { upcoming: (i) => i.state !== 'expired', soon: (i) => i.state === 'soon', expired: (i) => i.state === 'expired' };
const tabs = computed(() => [['upcoming', 'Upcoming'], ['soon', 'Due Soon'], ['expired', 'Expired']].map(([k, l]) => [k, l, items.value.filter(matches[k]).length]));
const list = computed(() => items.value.filter(matches[tab.value]));
const chip = { expired: 'bg-red-100 text-red-700', soon: 'bg-amber-100 text-amber-800', valid: 'bg-slate-100 text-slate-700', none: 'bg-slate-100 text-slate-700' };
const EMPTY = { upcoming: 'No upcoming dates yet. Add a reminder or an expiry date to a document.', soon: 'Nothing is due soon. You’re all set.', expired: 'Nothing has expired.' };
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <LbHeader title="Reminders" />
    <div class="mb-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Reminder status">
      <button v-for="[k, l, n] in tabs" :key="k" role="tab" :aria-selected="tab === k" :class="['min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-medium', tab === k ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700']" @click="tab = k">{{ l }} ({{ n }})</button>
    </div>
    <div v-if="!list.length" class="card py-12 text-center"><BellOff class="mx-auto mb-3 h-9 w-9 text-slate-300" /><p class="mx-auto max-w-xs text-sm text-slate-500">{{ EMPTY[tab] }}</p><RouterLink v-if="tab === 'upcoming'" to="/app/lifebox/reminders/new" class="btn-primary mt-4">Add reminder</RouterLink></div>
    <ul v-else class="card divide-y !p-0">
      <li v-for="i in list" :key="i.key"><RouterLink :to="i.kind === 'document' ? `/app/lifebox/view/${i.id}` : `/app/lifebox/reminders/${i.id}`" class="flex min-h-[68px] items-center gap-3 p-3 hover:bg-slate-50">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" :style="{ background: catOf(i.category).color }"><component :is="iconOf(i.category)" class="h-5 w-5" /></span>
        <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ i.title }}</span><span class="block text-xs text-slate-500">{{ i.label }}<span v-if="i.kind === 'document'"> · Document</span></span></span>
        <span :class="['badge shrink-0', chip[i.state]]">{{ fmtDate(i.date) }}</span><ChevronRight class="h-4 w-4 shrink-0 text-slate-400" />
      </RouterLink></li>
    </ul>
  </div>
</template>
