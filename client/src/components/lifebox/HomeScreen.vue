<script setup>
import { computed } from 'vue';
import { Lock, Upload, ScanLine, CalendarPlus, FileText, Bell, HeartPulse, History, ChevronRight, Settings, AlertTriangle } from 'lucide-vue-next';
import { useLifeBox } from '../../stores/lifeboxStore';
import { fmtDate } from '../../lib/format';
import { catOf, dateItems, fmtSize } from '../../lib/lifebox';
import { iconOf } from '../../lib/lbIcons';

const lb = useLifeBox();
const items = computed(() => dateItems(lb.docs, lb.reminders));
const upcoming = computed(() => items.value.filter((i) => i.state !== 'expired' && i.days <= 60).length);
const attention = computed(() => items.value.filter((i) => i.state === 'expired' || i.state === 'soon').length);
const recent = computed(() => lb.docs.slice(0, 4));
const QUICK = [['Upload Document', 'upload', Upload, 'bg-indigo-50 text-indigo-600'], ['Scan Document', 'scan', ScanLine, 'bg-sky-50 text-sky-600'], ['Add Reminder', 'reminders/new', CalendarPlus, 'bg-rose-50 text-rose-600']];
const TILES = computed(() => [['My Documents', `${lb.docs.length} file${lb.docs.length === 1 ? '' : 's'}`, 'documents', FileText, 'text-amber-500'], ['Reminders', `${items.value.length} date${items.value.length === 1 ? '' : 's'}`, 'reminders', Bell, 'text-indigo-500'], ['Emergency Card', lb.emergency ? 'Ready' : 'Set up', 'emergency', HeartPulse, 'text-rose-500'], ['Life Timeline', `${lb.events.length} moment${lb.events.length === 1 ? '' : 's'}`, 'timeline', History, 'text-emerald-500']]);
</script>

<template>
  <div class="min-w-0">
    <header class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0"><h1 class="text-2xl font-extrabold">LifeBox</h1><p class="text-sm text-slate-500">Your important things, in one secure place.</p></div>
      <RouterLink to="/app/lifebox/settings" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50" aria-label="LifeBox settings"><Settings class="h-5 w-5" /></RouterLink>
    </header>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div class="min-w-0 space-y-5">
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-5 text-white shadow-lg">
          <Lock class="absolute -right-3 -top-2 h-28 w-28 rotate-12 text-white/15" aria-hidden="true" />
          <h2 class="text-lg font-bold">Your LifeBox</h2>
          <p class="mt-1 max-w-[15rem] text-sm text-indigo-100">Keep your documents, reminders, and personal records safe and organized.</p>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <RouterLink to="/app/lifebox/documents" class="rounded-2xl bg-white/20 p-3 backdrop-blur transition hover:bg-white/30"><p class="text-2xl font-extrabold">{{ lb.docs.length }}</p><p class="text-xs text-indigo-50">Documents</p></RouterLink>
            <RouterLink to="/app/lifebox/reminders" class="rounded-2xl bg-white/20 p-3 backdrop-blur transition hover:bg-white/30"><p class="text-2xl font-extrabold">{{ upcoming }}</p><p class="text-xs text-indigo-50">Upcoming dates</p></RouterLink>
          </div>
        </section>

        <RouterLink v-if="attention" to="/app/lifebox/reminders" class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900"><AlertTriangle class="h-5 w-5 shrink-0" />{{ attention }} item{{ attention === 1 ? '' : 's' }} need{{ attention === 1 ? 's' : '' }} your attention<ChevronRight class="ml-auto h-4 w-4" /></RouterLink>

        <section>
          <h2 class="mb-3 font-semibold">Quick Actions</h2>
          <div class="grid grid-cols-3 gap-3">
            <RouterLink v-for="[l, to, icon, c] in QUICK" :key="to" :to="`/app/lifebox/${to}`" class="card flex min-w-0 flex-col items-center gap-2 !p-3 text-center transition hover:shadow-md"><span :class="['flex h-11 w-11 items-center justify-center rounded-xl', c]"><component :is="icon" class="h-5 w-5" /></span><span class="break-words text-xs font-medium leading-tight">{{ l }}</span></RouterLink>
          </div>
        </section>
      </div>

      <div class="min-w-0 space-y-5">
        <section>
          <h2 class="mb-3 font-semibold">Your LifeBox</h2>
          <div class="grid grid-cols-2 gap-3">
            <RouterLink v-for="[l, sub, to, icon, c] in TILES" :key="to" :to="`/app/lifebox/${to}`" class="card flex items-center gap-3 !p-3 transition hover:shadow-md"><component :is="icon" :class="['h-6 w-6 shrink-0', c]" /><span class="min-w-0"><span class="block break-words text-sm font-semibold leading-tight">{{ l }}</span><span class="block truncate text-xs text-slate-500">{{ sub }}</span></span></RouterLink>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Recent Documents</h2><RouterLink to="/app/lifebox/documents" class="text-sm font-medium text-indigo-600 hover:underline">View all</RouterLink></div>
          <div v-if="!recent.length" class="card py-8 text-center text-sm text-slate-500">No documents yet. <RouterLink to="/app/lifebox/upload" class="font-medium text-indigo-600 hover:underline">Upload your first one</RouterLink>.</div>
          <ul v-else class="card divide-y !p-0">
            <li v-for="d in recent" :key="d.id"><RouterLink :to="`/app/lifebox/view/${d.id}`" class="flex min-h-[64px] items-center gap-3 p-3 hover:bg-slate-50"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" :style="{ background: catOf(d.category).color }"><component :is="iconOf(d.category)" class="h-5 w-5" /></span><span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ d.name }}</span><span class="block truncate text-xs text-slate-500">{{ catOf(d.category).single }}{{ d.file_size ? ` · ${fmtSize(d.file_size)}` : '' }}</span></span><span class="shrink-0 text-xs text-slate-500">{{ fmtDate(d.created_at.slice(0, 10)) }}</span></RouterLink></li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>