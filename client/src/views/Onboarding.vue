<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthShell from '../components/AuthShell.vue';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useToast } from '../stores/toast';
import { TIMEZONES } from '../lib/timezones';

const auth = useAuth(); const router = useRouter(); const toast = useToast();
const name = ref(auth.profile?.full_name || ''); const tz = ref(auth.profile?.timezone || 'Asia/Manila'); const busy = ref(false);

async function finish() {
  if (name.value.trim().length < 2) return toast.error('Please enter your name.');
  busy.value = true;
  try {
    auth.profile = { ...auth.profile, ...(await api('/profile', { method: 'PATCH', body: { full_name: name.value.trim(), timezone: tz.value, onboarded: true } })).data };
    router.push('/app/dashboard');
  } catch (e) { toast.error(e.message); } finally { busy.value = false; }
}
</script>
<template>
  <AuthShell title="Welcome to AyosKo 👋" subtitle="Two quick things before we start.">
    <form class="space-y-4" @submit.prevent="finish">
      <div><label class="label">What should we call you?</label><input v-model="name" class="input" /></div>
      <div><label class="label">Timezone</label><select v-model="tz" class="input"><option v-for="z in TIMEZONES" :key="z">{{ z }}</option></select></div>
      <p class="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800">Notifications appear inside AyosKo (the bell icon). We don't send push, email, or SMS alerts, so check in regularly. You can change these settings anytime.</p>
      <button class="btn-primary w-full" :disabled="busy">{{ busy ? 'Saving…' : 'Get started' }}</button>
    </form>
  </AuthShell>
</template>
