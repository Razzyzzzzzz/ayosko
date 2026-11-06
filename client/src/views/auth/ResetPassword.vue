<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import PasswordInput from '../../components/PasswordInput.vue';
import { supabase, friendlyAuthError } from '../../lib/supabase';
import { useAuth } from '../../stores/auth';
import { useToast } from '../../stores/toast';

const auth = useAuth(); const router = useRouter(); const toast = useToast();
const pw = ref(''); const confirm = ref(''); const loading = ref(false); const error = ref('');

async function submit() {
  error.value = '';
  if (pw.value.length < 8 || !/[A-Za-z]/.test(pw.value) || !/\d/.test(pw.value)) return (error.value = 'Password must be at least 8 characters with letters and numbers.');
  if (pw.value !== confirm.value) return (error.value = 'Passwords do not match.');
  loading.value = true;
  const { error: err } = await supabase.auth.updateUser({ password: pw.value });
  loading.value = false;
  if (err) return (error.value = friendlyAuthError(err));
  toast.success('Password updated.');
  router.push('/app/dashboard');
}
</script>
<template>
  <AuthShell title="Set a new password">
    <div v-if="!auth.session" class="space-y-3 text-sm">
      <p class="rounded-lg bg-amber-50 p-3 text-amber-800">This reset link is invalid or has expired.</p>
      <RouterLink to="/forgot-password" class="btn-primary w-full">Request a new link</RouterLink>
    </div>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div><label class="label" for="a">New password</label><PasswordInput id="a" v-model="pw" autocomplete="new-password" /></div>
      <div><label class="label" for="b">Confirm password</label><PasswordInput id="b" v-model="confirm" autocomplete="new-password" /></div>
      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <button class="btn-primary w-full" :disabled="loading">{{ loading ? 'Saving…' : 'Update password' }}</button>
    </form>
  </AuthShell>
</template>
