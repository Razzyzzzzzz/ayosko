<script setup>
import { computed } from 'vue';
import { History, ChevronRight } from 'lucide-vue-next';
import LbHeader from './LbHeader.vue';
import { useLifeBox } from '../../stores/lifeboxStore';

const lb = useLifeBox();
const events = computed(() => [...lb.events].sort((a, b) => b.event_date.localeCompare(a.event_date)));
const parts = (d) => ({ year: d.slice(0, 4), md: new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) });
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <LbHeader title="Life Timeline" />
    <section class="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-violet-100 to-amber-100 p-5">
      <span class="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/70" aria-hidden="true" /><span class="absolute -bottom-8 right-10 h-24 w-40 rounded-t-full bg-indigo-300/50" aria-hidden="true" />
      <h2 class="relative text-lg font-bold text-indigo-950">Your journey, your story.</h2><p class="relative max-w-[16rem] text-sm text-indigo-900/80">Record your milestones and cherished moments.</p>
    </section>
    <div v-if="!events.length" class="card py-12 text-center"><History class="mx-auto mb-3 h-9 w-9 text-slate-300" /><p class="font-medium">No moments yet</p><p class="mb-4 mt-1 text-sm text-slate-500">Add a graduation, a first job, a trip. Anything worth remembering.</p><RouterLink to="/app/lifebox/timeline/new" class="btn-primary">Add a life event</RouterLink></div>
    <ul v-else class="space-y-3">
      <li v-for="e in events" :key="e.id"><RouterLink :to="`/app/lifebox/timeline/${e.id}`" class="card flex min-h-[84px] items-center gap-3 !p-3 transition hover:shadow-md">
        <span class="w-14 shrink-0 text-center"><span class="block text-lg font-extrabold leading-tight text-indigo-700">{{ parts(e.event_date).year }}</span><span class="text-xs text-slate-500">{{ parts(e.event_date).md }}</span></span>
        <span class="min-w-0 flex-1"><span class="block truncate font-semibold">{{ e.title }}</span><span v-if="e.description" class="line-clamp-2 text-xs text-slate-500">{{ e.description }}</span></span>
        <img v-if="e.photo_url" :src="e.photo_url" :alt="`Photo for ${e.title}`" loading="lazy" class="h-16 w-16 shrink-0 rounded-xl object-cover" />
        <ChevronRight v-else class="h-4 w-4 shrink-0 text-slate-400" />
      </RouterLink></li>
    </ul>
  </div>
</template>
