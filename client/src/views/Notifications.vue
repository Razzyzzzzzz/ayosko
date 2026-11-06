<script setup>
import { ref, onMounted } from 'vue';
import { CheckSquare, Receipt, CalendarClock, FileText } from 'lucide-vue-next';
import { api } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { useToast } from '../stores/toast';

const toast = useToast(); const items = ref([]); const loading = ref(true);
const icons = { task: CheckSquare, bill: Receipt, appointment: CalendarClock, document: FileText };
const routes = { task: '/app/tasks', bill: '/app/bills', appointment: '/app/appointments', document: '/app/documents' };

const load = async () => { try { items.value = (await api('/notifications')).data; } catch (e) { toast.error(e.message); } finally { loading.value = false; } };
onMounted(load);
async function read(n) { if (n.read) return; await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {}); n.read = true; }
async function readAll() { try { await api('/notifications/read-all', { method: 'PATCH' }); items.value.forEach((n) => (n.read = true)); } catch (e) { toast.error(e.message); } }
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-4 flex items-center justify-between"><h1 class="text-2xl font-bold">Notifications</h1><button class="btn-ghost" @click="readAll">Mark all read</button></div>
    <p class="mb-4 rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800">Alerts are generated hourly by the server and shown here only. No push, email, or SMS is sent, so open AyosKo regularly. Adjust timing in Profile → Notifications.</p>
    <p v-if="loading" class="text-sm text-slate-500">Loading…</p>
    <div v-else-if="!items.length" class="card py-10 text-center text-sm text-slate-500">You're all caught up. No notifications yet.</div>
    <ul v-else class="space-y-2">
      <li v-for="n in items" :key="n.id">
        <RouterLink :to="routes[n.type]" :class="['card flex items-start gap-3 !p-4 transition hover:shadow-md', !n.read && 'border-indigo-300 bg-indigo-50/50']" @click="read(n)">
          <component :is="icons[n.type]" class="mt-0.5 h-5 w-5 text-indigo-600" />
          <div class="min-w-0 flex-1"><p class="font-medium">{{ n.title }}</p><p class="text-sm text-slate-500">{{ n.body }}</p><p class="mt-1 text-xs text-slate-400">{{ fmtDateTime(n.created_at) }}</p></div>
          <span v-if="!n.read" class="mt-2 h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread" />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
