<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import PasswordInput from '../../components/PasswordInput.vue';
import { supabase, friendlyAuthError } from '../../lib/supabase';

const route = useRoute(); const router = useRouter();
const email = ref(String(route.query.email || ''));
const password = ref('');
const loading = ref(false);
const emailError = ref('');
const passwordError = ref('');
const formError = ref('');
const credsError = ref(false);
const capsOn = ref(false);
const emailEl = ref(null);
const pwWrap = ref(null);
const errCls = 'border-red-400 focus:border-red-500 focus:ring-red-200';

const NOTICE_TONES = { amber: 'bg-amber-50 text-amber-800', green: 'bg-emerald-50 text-emerald-800' };
const notice = computed(() => {
  const q = route.query;
  if (q.expired) return { tone: 'amber', text: 'Your session expired. Please log in again.' };
  if (q.error === 'server') return { tone: 'amber', text: 'Cannot reach the server. Please try again shortly.' };
  if (q.reset) return { tone: 'green', text: 'Password updated. Log in with your new password.' };
  return null;
});

const pwInput = () => pwWrap.value?.querySelector('input');
watch(email, () => { emailError.value = ''; formError.value = ''; });
watch(password, () => { passwordError.value = ''; formError.value = ''; });

onMounted(() => {
  // Autofocus lang sa desktop; sa phone, hindi kusang lalabas ang keyboard
  if (window.matchMedia('(pointer: fine)').matches) (email.value ? pwInput() : emailEl.value)?.focus();
});

const checkCaps = (e) => { if (typeof e.getModifierState === 'function') capsOn.value = e.getModifierState('CapsLock'); };

function validate() {
  emailError.value = passwordError.value = formError.value = '';
  credsError.value = false;
  const e = email.value.trim();
  if (!e) emailError.value = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(e)) emailError.value = 'That doesn’t look like an email address. Check for typos.';
  if (!password.value) passwordError.value = 'Enter your password.';
  if (emailError.value) { emailEl.value?.focus(); return false; }
  if (passwordError.value) { pwInput()?.focus(); return false; }
  return true;
}

function redirectTarget() {
  const t = String(route.query.redirect || '');
  return t.startsWith('/') && !t.startsWith('//') ? t : '/app/dashboard';
}

async function submit() {
  if (loading.value || !validate()) return;
  loading.value = true;
  const { error: err } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  loading.value = false;
  if (err) {
    // Hindi pa verified: magpadala ng bagong code at dalhin sa verify page
    if (/not confirmed/i.test(err.message)) {
      return router.push({ path: '/verify-email', query: { email: email.value.trim(), resend: '1' } });
    }
    credsError.value = /invalid login/i.test(err.message);
    formError.value = friendlyAuthError(err);
    pwInput()?.focus();
    return;
  }
  router.push(redirectTarget());
}
</script>

<template>
  <AuthShell title="Welcome back" subtitle="Log in to your AyosKo account.">
    <p v-if="notice" :class="['mb-4 rounded-lg p-3 text-sm leading-relaxed', NOTICE_TONES[notice.tone]]" role="status">{{ notice.text }}</p>

    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" ref="emailEl" v-model="email" type="email" inputmode="email" autocomplete="username"
          autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="you@example.com"
          class="input" :class="emailError && errCls" :aria-invalid="!!emailError" :aria-describedby="emailError ? 'email-err' : undefined" />
        <p v-if="emailError" id="email-err" class="mt-1 text-xs text-red-600">{{ emailError }}</p>
      </div>

      <div>
        <div class="mb-1 flex flex-wrap items-center justify-between gap-x-3">
          <label class="text-sm font-medium text-slate-700" for="pw">Password</label>
          <RouterLink to="/forgot-password" class="-my-1 inline-block py-1 text-sm font-medium text-indigo-600 hover:underline">Forgot password?</RouterLink>
        </div>
        <div ref="pwWrap" @keydown="checkCaps" @keyup="checkCaps">
          <PasswordInput id="pw" v-model="password" autocomplete="current-password" placeholder="Your password"
            :invalid="!!passwordError" :describedby="passwordError ? 'pw-err' : capsOn ? 'pw-caps' : undefined" />
        </div>
        <p v-if="passwordError" id="pw-err" class="mt-1 text-xs text-red-600">{{ passwordError }}</p>
        <p v-else-if="capsOn" id="pw-caps" class="mt-1 text-xs text-amber-700">Caps Lock is on.</p>
      </div>

      <div v-if="formError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
        {{ formError }}
        <RouterLink v-if="credsError" to="/forgot-password" class="mt-1 block py-1 font-medium underline">Reset your password</RouterLink>
      </div>

      <button class="btn-primary flex min-h-11 w-full items-center justify-center gap-2" :disabled="loading">
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
    </form>

    <template #footer>No account? <RouterLink to="/register" class="inline-block py-2 font-medium text-indigo-600 hover:underline">Sign up</RouterLink></template>
  </AuthShell>
</template>