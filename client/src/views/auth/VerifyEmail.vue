<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MailCheck } from 'lucide-vue-next';
import AuthShell from '../../components/AuthShell.vue';
import { supabase, friendlyAuthError } from '../../lib/supabase';
import { useAuth } from '../../stores/auth';
import { useToast } from '../../stores/toast';

const LEN = 6;        // dapat kapareho ng Supabase → Authentication → Sign In / Providers → Email → "Email OTP Length"
const COOLDOWN = 60;  // Supabase: 1 email lang per user kada 60 segundo

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const toast = useToast();
const email = String(route.query.email || '');

const digits = ref(Array(LEN).fill(''));
const boxes = ref([]);
const verifying = ref(false);
const sending = ref(false);
const error = ref('');
const shake = ref(false);
const wait = ref(0);
let timer;

const code = computed(() => digits.value.join(''));
const ready = computed(() => code.value.length === LEN);

// text-[1.25rem] (20px) para iwas auto-zoom sa iOS; h-12 sa maliit na phone, h-14 mula sm pataas
const boxClass =
  'aspect-[4/5] h-auto min-w-0 max-w-[3.5rem] flex-1 rounded-xl border bg-white p-0 text-center text-xl font-semibold tabular-nums text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 sm:text-2xl';

function focusBox(i) {
  nextTick(() => boxes.value[i]?.focus());
}

function clearBoxes() {
  digits.value = Array(LEN).fill('');
}

function startCooldown(seconds = COOLDOWN) {
  clearInterval(timer);
  wait.value = seconds;
  timer = setInterval(() => {
    wait.value -= 1;
    if (wait.value <= 0) clearInterval(timer);
  }, 1000);
}

// Ilagay ang mga digit simula sa box na `start` (para sa typing, paste, at autofill)
function fill(start, text) {
  const chars = text.replace(/\D/g, '').slice(0, LEN - start).split('');
  if (!chars.length) return;
  chars.forEach((c, k) => { digits.value[start + k] = c; });
  error.value = '';
  focusBox(Math.min(start + chars.length, LEN - 1));
}

function onInput(i, e) {
  const raw = e.target.value;
  if (!raw.replace(/\D/g, '')) {
    digits.value[i] = '';
    e.target.value = '';
    return;
  }
  fill(i, raw);
  e.target.value = digits.value[i];
}

function onKeydown(i, e) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) {
    e.preventDefault();
    digits.value[i - 1] = '';
    focusBox(i - 1);
  } else if (e.key === 'ArrowLeft' && i > 0) {
    e.preventDefault();
    focusBox(i - 1);
  } else if (e.key === 'ArrowRight' && i < LEN - 1) {
    e.preventDefault();
    focusBox(i + 1);
  }
}

function onPaste(e) {
  e.preventDefault();
  fill(0, e.clipboardData?.getData('text') || '');
}

async function verify() {
  if (!ready.value || verifying.value) return;
  if (!email) {
    error.value = 'We lost track of your email. Please sign up again.';
    return;
  }
  error.value = '';
  verifying.value = true;
  const { data, error: err } = await supabase.auth.verifyOtp({ email, token: code.value, type: 'signup' });
  verifying.value = false;

  if (err) {
    error.value = friendlyAuthError(err);
    shake.value = true;
    setTimeout(() => (shake.value = false), 400);
    clearBoxes();
    focusBox(0);
    return;
  }
  auth.session = data.session; // para siguradong may session na pagdating sa router guard
  toast.success('Email verified. Welcome to AyosKo!');
  router.replace(String(route.query.redirect || '/onboarding'));
}

async function resend() {
  if (!email || sending.value || wait.value > 0) return;
  sending.value = true;
  error.value = '';
  const { error: err } = await supabase.auth.resend({ type: 'signup', email });
  sending.value = false;
  if (err) {
    startCooldown(); // kung rate-limited, huwag hayaang i-spam ang button
    return toast.error(friendlyAuthError(err));
  }
  toast.success('New code sent. Check your inbox.');
  clearBoxes();
  startCooldown();
  focusBox(0);
}

watch(code, (c) => { if (c.length === LEN) verify(); });

onMounted(() => {
  if (route.query.resend) {
    // galing sa Login: hindi pa verified ang account, magpadala ng bagong code
    router.replace({ path: route.path, query: { email } });
    resend();
  } else {
    startCooldown();
  }
  // Sa phone, huwag i-autofocus: tatakpan ng keyboard ang form. Desktop lang.
  if (window.matchMedia('(pointer: fine)').matches) focusBox(0);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <AuthShell title="Enter your code">
    <div class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 sm:h-14 sm:w-14">
        <MailCheck class="h-6 w-6 text-indigo-600 sm:h-7 sm:w-7" aria-hidden="true" />
      </div>
      <p class="mt-3 text-sm leading-relaxed text-slate-600 sm:mt-4">
        We sent a {{ LEN }}-digit code to
        <b v-if="email" class="break-all text-slate-900">{{ email }}</b><span v-else>your email</span>.
        Check your spam folder if you don't see it.
      </p>
    </div>

    <form class="mt-5 space-y-4 sm:mt-6" novalidate @submit.prevent="verify">
      <div role="group" aria-labelledby="otp-label">
        <span id="otp-label" class="sr-only">Verification code</span>
        <div class="flex justify-center gap-1.5 min-[380px]:gap-2" :class="{ 'otp-shake': shake }">
          <input
            v-for="(d, i) in digits"
            :key="i"
            :ref="(el) => (boxes[i] = el)"
            :value="d"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            enterkeyhint="done"
            :autocomplete="i === 0 ? 'one-time-code' : 'off'"
            :aria-label="`Digit ${i + 1} of ${LEN}`"
            :aria-invalid="!!error"
            :disabled="verifying"
            :class="[boxClass, error ? 'border-red-400' : 'border-slate-300']"
            @input="onInput(i, $event)"
            @keydown="onKeydown(i, $event)"
            @paste="onPaste"
            @focus="$event.target.select()"
          />
        </div>
      </div>

      <p v-if="error" class="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700" role="alert">{{ error }}</p>

      <button class="btn-primary min-h-11 w-full" :disabled="!ready || verifying">
        {{ verifying ? 'Verifying…' : 'Verify email' }}
      </button>
    </form>

    <div class="mt-4 space-y-1 text-center text-sm text-slate-600 sm:mt-5">
      <p v-if="wait > 0" class="py-2">Need a new code? You can request one in {{ wait }}s.</p>
      <button
        v-else
        type="button"
        class="min-h-11 px-2 font-medium text-indigo-600 hover:underline disabled:opacity-60"
        :disabled="sending"
        @click="resend"
      >
        {{ sending ? 'Sending…' : 'Send a new code' }}
      </button>
      <p>
        Wrong email?
        <RouterLink to="/register" class="inline-block py-2 font-medium text-indigo-600 hover:underline">Sign up again</RouterLink>
      </p>
    </div>

    <template #footer>
      Already verified?
      <RouterLink to="/login" class="inline-block py-2 font-medium text-indigo-600 hover:underline">Log in</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
@keyframes otp-shake {
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.otp-shake { animation: otp-shake 0.4s; }
@media (prefers-reduced-motion: reduce) {
  .otp-shake { animation: none; }
}
</style>