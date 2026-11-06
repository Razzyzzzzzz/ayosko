<script setup>
import { ref } from 'vue';
import AuthShell from '../../components/AuthShell.vue';
import { supabase, friendlyAuthError } from '../../lib/supabase';

const email = ref(''); const loading = ref(false); const sent = ref(false); const error = ref('');
async function submit() {
  error.value = '';
  if (!/^\S+@\S+\.\S+$/.test(email.value)) return (error.value = 'Please enter a valid email address.');
  loading.value = true;
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: `${window.location.origin}/reset-password` });
  loading.value = false;
  err ? (error.value = friendlyAuthError(err)) : (sent.value = true);
}
</script>
<template>
  <AuthShell title="Forgot password?" subtitle="We'll email you a reset link.">
    <p v-if="sent" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">If an account exists for that email, a reset link is on its way. Check your inbox.</p>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div><label class="label" for="e">Email</label><input id="e" v-model="email" type="email" class="input" /></div>
      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Sending…' : 'Send reset link' }}</button>
    </form>
    <template #footer><RouterLink to="/login" class="font-medium text-indigo-600 hover:underline">Back to log in</RouterLink></template>
  </AuthShell>
</template>
