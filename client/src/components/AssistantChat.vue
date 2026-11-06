<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { X, Send } from 'lucide-vue-next';
import { api } from '../lib/api';
import { useToast } from '../stores/toast';
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';

const toast = useToast();
const available = ref(false); // lalabas lang kung may AI key ang server
const open = ref(false);
const input = ref('');
const messages = ref([]);
const sending = ref(false);
const listEl = ref(null);
const inputEl = ref(null);

const SUGGESTIONS = [
  'Ano ang mga due ngayong linggo?',
  'Magkano ang unpaid bills ko?',
  'Ano ang schedule ko bukas?',
  'Kailan mag-e-expire ang mga document ko?',
];

onMounted(async () => {
  try { available.value = (await api('/inbox/status')).data.ai_configured; } catch { /* hindi ipapakita ang button */ }
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

function onKey(e) { if (e.key === 'Escape') open.value = false; }

function openChat() {
  open.value = true;
  // Focus lang sa desktop; sa phone, hindi kusang lalabas ang keyboard
  nextTick(() => { if (window.matchMedia('(pointer: fine)').matches) inputEl.value?.focus(); });
}
function scrollDown() {
  nextTick(() => listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' }));
}

async function send(text = input.value) {
  const q = String(text).trim();
  if (!q || sending.value) return;
  messages.value.push({ role: 'user', content: q });
  input.value = '';
  sending.value = true;
  scrollDown();
  try {
    const payload = messages.value.filter((m) => !m.error).slice(-12).map(({ role, content }) => ({ role, content }));
    const { reply } = (await api('/assistant/chat', { method: 'POST', body: { messages: payload } })).data;
    messages.value.push({ role: 'assistant', content: reply });
  } catch (e) {
    toast.error(e.message);
    messages.value.push({ role: 'assistant', content: 'Sorry, I could not answer that right now. Please try again.', error: true });
  } finally {
    sending.value = false;
    scrollDown();
  }
}
</script>

<template>
  <div v-if="available">
    <!-- Floating button: nasa itaas ng bottom bar sa mobile -->
    <button v-if="!open" type="button"
      class="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-lg shadow-indigo-600/20 transition hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
      aria-label="Open AyosKo assistant" @click="openChat">
      <span class="block h-8 w-8 overflow-hidden"><img :src="logo" alt="" class="-ml-[22px] -mt-[11px] block w-[76px] max-w-none mix-blend-multiply" /></span>
    </button>

    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 lg:pointer-events-none" role="dialog" aria-label="AyosKo assistant">
        <div class="absolute inset-0 bg-slate-900/40 lg:hidden" @click="open = false" />
        <div class="pointer-events-auto absolute inset-x-0 bottom-0 flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:h-[34rem] lg:w-96 lg:rounded-2xl lg:border lg:border-slate-200">
          <!-- Header -->
          <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div class="min-w-0">
              <h2 class="font-semibold">AyosKo Assistant</h2>
              <p class="text-xs text-slate-500">Uses your tasks, bills, appointments, reminders and document names. Notes and files are not shared.</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button v-if="messages.length" type="button" class="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" @click="messages = []">New chat</button>
              <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Close assistant" @click="open = false"><X class="h-5 w-5" /></button>
            </div>
          </div>

          <!-- Messages -->
          <div ref="listEl" class="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            <div v-if="!messages.length" class="space-y-3">
              <p class="text-sm text-slate-600">Kumusta! Tanungin mo ako tungkol sa mga bayarin, gawain at schedule mo.</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="s in SUGGESTIONS" :key="s" type="button" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700" @click="send(s)">{{ s }}</button>
              </div>
            </div>

            <div v-for="(m, i) in messages" :key="i" :class="m.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
              <p class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm"
                :class="m.role === 'user' ? 'rounded-br-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : m.error ? 'rounded-bl-sm bg-red-50 text-red-700' : 'rounded-bl-sm bg-slate-100 text-slate-800'">{{ m.content }}</p>
            </div>

            <div v-if="sending" class="flex justify-start"><p class="animate-pulse rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-500">Thinking…</p></div>
          </div>

          <!-- Input -->
          <form class="border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" @submit.prevent="send()">
            <div class="flex items-center gap-2">
              <input ref="inputEl" v-model="input" class="input" maxlength="500" placeholder="Ask about your bills, tasks…" enterkeyhint="send" aria-label="Ask the assistant" />
              <button class="btn-primary btn-icon" :disabled="sending || !input.trim()" aria-label="Send"><Send class="h-4 w-4" /></button>
            </div>
            <p class="mt-2 text-center text-[11px] text-slate-400">AI can make mistakes. Double-check important dates and amounts.</p>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>