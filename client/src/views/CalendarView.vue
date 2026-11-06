<script setup>
import { ref, computed, onMounted } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { api } from '../lib/api';
import { ymd, todayStr, money } from '../lib/format';
import { useToast } from '../stores/toast';

const toast = useToast();
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = {
  Task: { dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700', to: '/app/tasks' },
  Bill: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', to: '/app/bills' },
  Appointment: { dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700', to: '/app/appointments' },
  Reminder: { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700', to: '/app/reminders' },
};

const today = todayStr();
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const selected = ref(today);
const items = ref([]);
const loading = ref(true);
const label = computed(() => cursor.value.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }));
const selectedLabel = computed(() => new Date(selected.value + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }));

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
const mk = (kind, date, text, meta, done, t) => ({ kind, date, label: text, meta, done: !!done, t, ...KINDS[kind] });

onMounted(async () => {
  try {
    const q = { params: { limit: 200 } };
    const [t, b, a, r] = await Promise.all(['/tasks', '/bills', '/appointments', '/reminders'].map((p) => api(p, q)));
    items.value = [
      ...t.data.filter((x) => x.due_date).map((x) => mk('Task', x.due_date, x.title, '', x.completed, -1)),
      ...b.data.filter((x) => x.due_date).map((x) => mk('Bill', x.due_date, x.name, money(x.amount), x.status === 'paid', -1)),
      ...a.data.map((x) => mk('Appointment', ymd(new Date(x.starts_at)), x.title, timeOf(x.starts_at), false, new Date(x.starts_at).getTime())),
      ...r.data.map((x) => mk('Reminder', ymd(new Date(x.remind_at)), x.title, timeOf(x.remind_at), x.done, new Date(x.remind_at).getTime())),
    ];
  } catch (e) { toast.error(e.message); } finally { loading.value = false; }
});

const days = computed(() => {
  const y = cursor.value.getFullYear(), m = cursor.value.getMonth();
  const lead = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => ymd(new Date(y, m, i + 1)))];
});

// Isang beses lang i-group ang items kada date (dati, nagfi-filter ito sa bawat cell)
const byDate = computed(() => {
  const m = new Map();
  for (const i of items.value) { if (!m.has(i.date)) m.set(i.date, []); m.get(i.date).push(i); }
  for (const list of m.values()) list.sort((a, b) => a.t - b.t);
  return m;
});
const on = (d) => byDate.value.get(d) || [];

function cellLabel(d) {
  const n = on(d).length;
  const long = new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
  return n ? `${long}, ${n} item${n > 1 ? 's' : ''}` : long;
}

const move = (n) => (cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1));
const goToday = () => { cursor.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1); selected.value = today; };

// Swipe pakaliwa/pakanan para magpalit ng buwan (mobile)
let sx = 0, sy = 0;
const onTouchStart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
const onTouchEnd = (e) => {
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
};
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Calendar</h1>
      <button class="btn-ghost" @click="goToday">Today</button>
    </div>

    <div class="grid gap-4 lg:grid-cols-3 lg:gap-6">
      <div class="card p-3 sm:p-5 lg:col-span-2" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <div class="mb-3 flex items-center justify-between">
          <button class="btn-ghost h-10 w-10 !p-0" aria-label="Previous month" @click="move(-1)"><ChevronLeft class="h-5 w-5" /></button>
          <h2 class="font-semibold" aria-live="polite">{{ label }}</h2>
          <button class="btn-ghost h-10 w-10 !p-0" aria-label="Next month" @click="move(1)"><ChevronRight class="h-5 w-5" /></button>
        </div>

        <div class="mb-1 grid grid-cols-7 text-center text-xs font-medium text-slate-500" aria-hidden="true">
          <span v-for="w in WEEK" :key="w"><span class="sm:hidden">{{ w[0] }}</span><span class="hidden sm:inline">{{ w }}</span></span>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <template v-for="(d, i) in days" :key="i">
            <span v-if="!d" />
            <button v-else type="button"
              class="flex h-12 flex-col items-center justify-start gap-1 rounded-xl pt-1.5 text-sm transition sm:h-24 sm:pt-2"
              :class="d === selected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'"
              :aria-label="cellLabel(d)" :aria-pressed="d === selected" :aria-current="d === today ? 'date' : undefined"
              @click="selected = d">
              <span class="flex h-7 w-7 items-center justify-center rounded-full"
                :class="d === today ? 'bg-indigo-600 font-semibold text-white' : d === selected ? 'font-semibold text-indigo-800' : 'text-slate-700'">{{ Number(d.slice(8)) }}</span>
              <!-- Mobile: tuldok -->
              <span class="flex gap-0.5 sm:hidden"><i v-for="(x, j) in on(d).slice(0, 3)" :key="j" :class="['h-1.5 w-1.5 rounded-full', x.dot]" /></span>
              <!-- Tablet/desktop: maikling label -->
              <span class="hidden w-full flex-col gap-0.5 px-0.5 sm:flex">
                <span v-for="(x, j) in on(d).slice(0, 2)" :key="j" :class="['truncate rounded px-1 text-left text-[11px] leading-4', x.chip, x.done && 'line-through opacity-60']">{{ x.label }}</span>
                <span v-if="on(d).length > 2" class="px-1 text-left text-[11px] text-slate-500">+{{ on(d).length - 2 }} more</span>
              </span>
            </button>
          </template>
        </div>

        <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500" aria-label="Legend">
          <li v-for="(k, name) in KINDS" :key="name" class="flex items-center gap-1.5"><i :class="['h-2 w-2 rounded-full', k.dot]" />{{ name }}</li>
        </ul>
      </div>

      <section class="card" aria-live="polite">
        <h2 class="mb-3 font-semibold">{{ selectedLabel }}</h2>
        <div v-if="loading" class="space-y-2" aria-busy="true">
          <div class="h-14 animate-pulse rounded-xl bg-slate-100" /><div class="h-14 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <p v-else-if="!on(selected).length" class="text-sm text-slate-500">Nothing planned for this day.</p>
        <ul v-else class="space-y-2">
          <li v-for="(x, i) in on(selected)" :key="i">
            <RouterLink :to="x.to" class="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50" :class="{ 'opacity-50': x.done }">
              <i :class="['mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', x.dot]" />
              <span class="min-w-0 flex-1">
                <span class="block text-xs text-slate-500">{{ x.kind }}<template v-if="x.meta"> · {{ x.meta }}</template></span>
                <span class="block break-words font-medium" :class="{ 'line-through': x.done }">{{ x.label }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
        <RouterLink :to="{ path: '/app/appointments', query: { new: 1 } }" class="btn-ghost mt-4 w-full">Add appointment</RouterLink>
      </section>
    </div>
  </div>
</template>