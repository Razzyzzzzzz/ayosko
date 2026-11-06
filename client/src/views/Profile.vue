<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../lib/api';
import { supabase, friendlyAuthError } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput.vue';
import { useAuth } from '../stores/auth';
import { useToast } from '../stores/toast';
import { TIMEZONES } from '../lib/timezones';

const auth = useAuth(); const toast = useToast();
const p = reactive({ full_name: '', timezone: 'Asia/Manila' });
const prefs = reactive({ tasks: true, bills: true, appointments: true, documents: true, lead_days: 3 });
const pw = reactive({ next: '', confirm: '' }); const busy = ref('');

onMounted(async () => {
  try {
    const d = await auth.loadProfile();
    Object.assign(p, { full_name: d.full_name, timezone: d.timezone }); Object.assign(prefs, d.preferences);
  } catch (e) { toast.error(e.message); }
});

async function run(key, fn) { busy.value = key; try { await fn(); } catch (e) { toast.error(e.message); } finally { busy.value = ''; } }

const saveProfile = () => run('p', async () => {
  if (p.full_name.trim().length < 2) return toast.error('Please enter your name.');
  await api('/profile', { method: 'PATCH', body: { full_name: p.full_name.trim(), timezone: p.timezone } });
  await auth.loadProfile(); toast.success('Profile saved.');
});
const savePrefs = () => run('n', async () => {
  const { tasks, bills, appointments, documents, lead_days } = prefs;
  await api('/profile/preferences', { method: 'PATCH', body: { tasks, bills, appointments, documents, lead_days: Number(lead_days) } });
  toast.success('Notification settings saved.');
});
const changePw = () => run('w', async () => {
  if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) return toast.error('Password must be at least 8 characters with letters and numbers.');
  if (pw.next !== pw.confirm) return toast.error('Passwords do not match.');
  const { error } = await supabase.auth.updateUser({ password: pw.next });
  if (error) return toast.error(friendlyAuthError(error));
  pw.next = pw.confirm = ''; toast.success('Password changed.');
});
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">Profile & Settings</h1>

    <form class="card space-y-4" @submit.prevent="saveProfile">
      <h2 class="font-semibold">Profile</h2>
      <div><label class="label">Email</label><input :value="auth.user?.email" class="input bg-slate-100" disabled /></div>
      <div><label class="label">Full name</label><input v-model="p.full_name" class="input" /></div>
      <div><label class="label">Timezone</label><select v-model="p.timezone" class="input"><option v-for="z in TIMEZONES" :key="z">{{ z }}</option></select></div>
      <button class="btn-primary" :disabled="busy === 'p'">Save profile</button>
    </form>

    <form class="card space-y-4" @submit.prevent="savePrefs">
      <h2 class="font-semibold">Notifications</h2>
      <p class="text-sm text-slate-500">AyosKo creates in-app alerts hourly. It does not send push, email, or SMS, so you'll see alerts when you open the app.</p>
      <label v-for="[k, l] in [['tasks', 'Task deadlines'], ['bills', 'Bills due & overdue'], ['appointments', 'Appointments'], ['documents', 'Document expirations']]" :key="k" class="flex items-center gap-3 text-sm"><input v-model="prefs[k]" type="checkbox" class="h-4 w-4 rounded" />{{ l }}</label>
      <div><label class="label">Alert me this many days ahead</label><input v-model="prefs.lead_days" type="number" min="0" max="30" class="input w-28" /></div>
      <button class="btn-primary" :disabled="busy === 'n'">Save notification settings</button>
    </form>

    <form class="card space-y-4" @submit.prevent="changePw">
      <h2 class="font-semibold">Change password</h2>
      <div><label class="label">New password</label><PasswordInput v-model="pw.next" autocomplete="new-password" /></div>
      <div><label class="label">Confirm new password</label><PasswordInput v-model="pw.confirm" autocomplete="new-password" /></div>
      <button class="btn-primary" :disabled="busy === 'w'">Update password</button>
    </form>
  </div>
</template>
