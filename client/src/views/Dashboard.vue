<script setup>
import { ref, computed, onMounted } from 'vue';
import { CheckSquare, CheckCheck, Bell, Receipt, AlertTriangle } from 'lucide-vue-next';
import { api } from '../lib/api';
import { fmtDate, money, todayStr, ymd } from '../lib/format';
import { useAuth } from '../stores/auth';
import { useToast } from '../stores/toast';

const auth = useAuth(); const toast = useToast();
const d = ref(null); const loading = ref(true); const failed = ref(false); const busyId = ref('');
const now = new Date();
const today = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

// silent = walang skeleton flash kapag nag-refresh pagkatapos ng quick action
async function load(silent = false) {
  if (!silent) loading.value = true;
  failed.value = false;
  try { d.value = (await api('/dashboard')).data; } catch (e) { failed.value = true; toast.error(e.message); } finally { loading.value = false; }
}
onMounted(() => load());

// Mga petsang madaling basahin: Today, Tomorrow, In 3 days, 2 days overdue
const dayDiff = (s) => Math.round((new Date(`${s}T00:00:00`) - new Date(`${todayStr()}T00:00:00`)) / 864e5);
function rel(s) {
  const n = dayDiff(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 1 && n <= 7 ? `In ${n} days` : fmtDate(s);
}
const overdueText = (s) => { const n = -dayDiff(s); return n <= 1 ? 'Due yesterday' : `${n} days overdue`; };
const relTime = (iso) => `${rel(ymd(new Date(iso)))}, ${new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;

const overdueTasks = computed(() => d.value?.overdue_tasks || []);
const overdueTaskCount = computed(() => d.value?.stats?.overdue_tasks ?? overdueTasks.value.length);

const stats = computed(() => !d.value ? [] : [
  { icon: CheckSquare, label: 'Open tasks', val: d.value.stats.open_tasks, tone: 'bg-indigo-50 text-indigo-600', to: '/app/tasks' },
  { icon: CheckCheck, label: 'Completed', val: d.value.stats.completed_tasks, tone: 'bg-emerald-50 text-emerald-600', to: '/app/tasks' },
  { icon: Receipt, label: 'Bills due soon', val: d.value.bills_due_soon.length, tone: 'bg-amber-50 text-amber-600', to: '/app/bills' },
  { icon: Bell, label: 'Unread alerts', val: d.value.stats.unread_notifications, tone: 'bg-violet-50 text-violet-600', to: '/app/notifications' },
]);

const timeline = computed(() => {
  if (!d.value) return [];
  const at = (s) => (s.length === 10 ? `${s}T00:00:00` : s);
  return [
    ...d.value.upcoming_deadlines.map((x) => ({ k: 'Task', label: x.title, when: at(x.due_date), text: rel(x.due_date), c: 'bg-indigo-500', to: '/app/tasks' })),
    ...d.value.pending_reminders.map((x) => ({ k: 'Reminder', label: x.title, when: x.remind_at, text: relTime(x.remind_at), c: 'bg-violet-500', to: '/app/reminders' })),
    ...d.value.upcoming_appointments.map((x) => ({ k: 'Appointment', label: x.title, when: x.starts_at, text: relTime(x.starts_at), c: 'bg-sky-500', to: '/app/appointments' })),
    ...d.value.bills_due_soon.map((x) => ({ k: 'Bill', label: `${x.name} · ${money(x.amount)}`, when: at(x.due_date), text: rel(x.due_date), c: 'bg-amber-500', to: '/app/bills' })),
  ].sort((a, b) => new Date(a.when) - new Date(b.when));
});

// Quick actions: isang pindot lang, walang pagpunta sa ibang page
async function quick(kind, row) {
  if (busyId.value) return;
  busyId.value = `${kind}-${row.id}`;
  try {
    if (kind === 'bill') await api(`/bills/${row.id}`, { method: 'PATCH', body: { status: 'paid' } });
    else await api(`/tasks/${row.id}`, { method: 'PATCH', body: { completed: true } });
    toast.success(kind === 'bill' ? 'Marked as paid.' : 'Task completed.');
    await load(true);
  } catch (e) { toast.error(e.message); } finally { busyId.value = ''; }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">{{ greeting }}, {{ auth.profile?.full_name?.split(' ')[0] }}!</h1>
    <p class="mb-5 text-sm text-slate-500 sm:mb-6">{{ today }}</p>

    <!-- Loading skeleton -->
    <div v-if="loading" aria-busy="true" aria-label="Loading your dashboard">
      <div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div v-for="n in 4" :key="n" class="h-[4.5rem] animate-pulse rounded-xl bg-slate-200/70 sm:h-24" />
      </div>
      <div class="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div class="h-64 animate-pulse rounded-xl bg-slate-200/70 lg:col-span-2" />
        <div class="h-40 animate-pulse rounded-xl bg-slate-200/70" />
      </div>
    </div>

    <!-- Error + retry -->
    <div v-else-if="failed" class="card py-10 text-center">
      <p class="font-medium">We couldn't load your dashboard.</p>
      <p class="mb-4 mt-1 text-sm text-slate-500">Check your connection, then try again.</p>
      <button class="btn-primary" @click="load()">Try again</button>
    </div>

    <template v-else-if="d">
      <!-- Mga babala -->
      <RouterLink v-if="d.overdue_bills.length" to="/app/bills" class="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle class="h-4 w-4 shrink-0" /> You have {{ d.overdue_bills.length }} overdue bill{{ d.overdue_bills.length > 1 ? 's' : '' }}. Tap to review.
      </RouterLink>
      <RouterLink v-if="overdueTaskCount" to="/app/tasks" class="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle class="h-4 w-4 shrink-0" /> You have {{ overdueTaskCount }} overdue task{{ overdueTaskCount > 1 ? 's' : '' }}. Tap to review.
      </RouterLink>

      <div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RouterLink v-for="s in stats" :key="s.label" :to="s.to" class="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
          <span :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.tone]"><component :is="s.icon" class="h-5 w-5" /></span>
          <span class="min-w-0"><span class="block text-2xl font-bold leading-none">{{ s.val }}</span><span class="mt-1 block truncate text-xs text-slate-500 sm:text-sm">{{ s.label }}</span></span>
        </RouterLink>
      </div>

      <div class="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <section class="card lg:col-span-2">
          <h2 class="mb-4 font-semibold">Next 7 days</h2>
          <p v-if="!timeline.length" class="py-6 text-center text-sm text-slate-500">Nothing scheduled. Enjoy the free time, or add something with the + button.</p>
          <ol v-else class="relative space-y-3 border-l-2 border-indigo-100 pl-5">
            <li v-for="(t, i) in timeline" :key="i" class="relative">
              <span :class="['absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full ring-4 ring-white', t.c]" />
              <RouterLink :to="t.to" class="block min-h-[2.75rem] rounded-lg p-2 hover:bg-slate-50">
                <p class="text-xs text-slate-500">{{ t.k }} · {{ t.text }}</p>
                <p class="break-words font-medium">{{ t.label }}</p>
              </RouterLink>
            </li>
          </ol>
        </section>

        <div class="space-y-4 lg:space-y-6">
          <!-- Overdue tasks -->
          <section v-if="overdueTasks.length" class="card">
            <h2 class="mb-3 font-semibold">Overdue tasks</h2>
            <ul class="space-y-3 text-sm">
              <li v-for="t in overdueTasks" :key="t.id" class="flex items-start justify-between gap-3">
                <span class="min-w-0"><span class="block break-words font-medium">{{ t.title }}</span><span class="block text-xs text-red-600">{{ overdueText(t.due_date) }}</span></span>
                <button class="btn-ghost btn-sm shrink-0" :disabled="!!busyId" @click="quick('task', t)">{{ busyId === `task-${t.id}` ? 'Saving…' : 'Done' }}</button>
              </li>
            </ul>
            <RouterLink v-if="overdueTaskCount > overdueTasks.length" to="/app/tasks" class="mt-3 block text-center text-sm font-medium text-indigo-600 hover:underline">View all {{ overdueTaskCount }}</RouterLink>
          </section>

          <!-- Overdue bills -->
          <section class="card">
            <h2 class="mb-3 font-semibold">Overdue bills</h2>
            <p v-if="!d.overdue_bills.length" class="text-sm text-slate-500">All caught up.</p>
            <ul v-else class="space-y-3 text-sm">
              <li v-for="b in d.overdue_bills" :key="b.id" class="flex items-start justify-between gap-3">
                <span class="min-w-0"><span class="block break-words font-medium">{{ b.name }}</span><span class="block text-xs text-red-600">{{ money(b.amount) }} · {{ overdueText(b.due_date) }}</span></span>
                <button class="btn-ghost btn-sm shrink-0" :disabled="!!busyId" @click="quick('bill', b)">{{ busyId === `bill-${b.id}` ? 'Saving…' : 'Mark paid' }}</button>
              </li>
            </ul>
            <RouterLink to="/app/calendar" class="btn-ghost mt-4 w-full">Open calendar</RouterLink>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>