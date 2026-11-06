<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import PasswordInput from '../../components/PasswordInput.vue';
import { supabase, friendlyAuthError } from '../../lib/supabase';

const router = useRouter();
const f = ref({ name: '', email: '', password: '', confirm: '' });
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  const { name, email, password, confirm } = f.value;
  if (name.trim().length < 2) return (error.value = 'Please enter your full name.');
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return (error.value = 'Please enter a valid email address.');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return (error.value = 'Password must be at least 8 characters with letters and numbers.');
  if (password !== confirm) return (error.value = 'Passwords do not match.');

  loading.value = true;
  const { data, error: err } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  loading.value = false;

  if (err) return (error.value = friendlyAuthError(err));
  // Supabase returns an obfuscated user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) return (error.value = 'An account with this email already exists. Try logging in.');

  // Naka-off ang "Confirm email" → may session agad, diretso na sa onboarding.
  if (data.session) return router.push('/onboarding');
  // Naka-on ang "Confirm email" → hintayin muna ang 6-digit code.
  router.push({ path: '/verify-email', query: { email: email.trim() } });
}
</script>
<template>
  <AuthShell title="Create your account" subtitle="Start organizing your life in minutes.">
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label class="label" for="n">Full name</label>
        <input id="n" v-model="f.name" autocomplete="name" autocapitalize="words" enterkeyhint="next" class="input" />
      </div>
      <div>
        <label class="label" for="e">Email</label>
        <input id="e" v-model="f.email" type="email" inputmode="email" autocomplete="email" autocapitalize="none"
          autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="you@example.com" class="input" />
      </div>
      <div>
        <label class="label" for="p">Password</label>
        <PasswordInput id="p" v-model="f.password" autocomplete="new-password" />
        <p class="mt-1 text-xs text-slate-500">At least 8 characters, with letters and numbers.</p>
      </div>
      <div><label class="label" for="c">Confirm password</label><PasswordInput id="c" v-model="f.confirm" autocomplete="new-password" /></div>
      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <button class="btn-primary min-h-11 w-full" :disabled="loading">{{ loading ? 'Creating account…' : 'Create account' }}</button>
    </form>
    <template #footer>Already registered? <RouterLink to="/login" class="inline-block py-2 font-medium text-indigo-600 hover:underline">Log in</RouterLink></template>
  </AuthShell>
</template>