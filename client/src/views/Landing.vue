<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  CheckSquare, Receipt, CalendarClock, FileText, Sparkles, ShieldCheck,
  CalendarCheck, Send, Check, Bell,
} from 'lucide-vue-next';
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';

/* Ang apat na bagay na sinusubaybayan. Pareho ang kulay ng bawat uri
   sa hero demo at sa listahan sa ibaba para magkaugnay. */
const areas = [
  { icon: CheckSquare, title: 'Tasks', text: 'Priorities, categories, due dates, and recurring tasks.', tile: 'bg-indigo-50 text-indigo-600' },
  { icon: Receipt, title: 'Bills', text: 'See what is due soon and what is already overdue.', tile: 'bg-amber-50 text-amber-600' },
  { icon: CalendarClock, title: 'Appointments', text: 'Dates, times, locations, and a built-in calendar.', tile: 'bg-sky-50 text-sky-600' },
  { icon: FileText, title: 'Documents', text: 'Track expiry dates and attach private files.', tile: 'bg-emerald-50 text-emerald-600' },
];

/* Life Inbox demo: isinusulat ang pangungusap, tapos lumalabas ang nabasang detalye. */
const examples = [
  { text: 'Bayaran ang internet sa November 15', kind: 'Bill', icon: Receipt, tile: 'bg-amber-50 text-amber-600', title: 'Internet bill', when: 'Due Nov 15', note: 'Remind me 1 day before' },
  { text: 'Dentist bukas 3pm', kind: 'Appointment', icon: CalendarClock, tile: 'bg-sky-50 text-sky-600', title: 'Dentist', when: 'Tomorrow, 3:00 PM', note: 'Remind me 1 hour before' },
  { text: 'Ipa-renew ang passport bago mag-March', kind: 'Document', icon: FileText, tile: 'bg-emerald-50 text-emerald-600', title: 'Renew passport', when: 'Before March', note: 'Remind me 2 weeks before' },
];

const idx = ref(0);
const typed = ref('');
const showCard = ref(false);
let alive = true;
const timers = [];
const wait = (ms) => new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });

async function run() {
  while (alive) {
    const ex = examples[idx.value];
    typed.value = '';
    showCard.value = false;
    await wait(500);
    for (const ch of ex.text) {
      if (!alive) return;
      typed.value += ch;
      await wait(45);
    }
    await wait(400);
    showCard.value = true;
    await wait(3400);
    showCard.value = false;
    await wait(450);
    idx.value = (idx.value + 1) % examples.length;
  }
}

onMounted(() => {
  // Igalang ang "reduce motion": ipakita na lang ang unang halimbawa, walang animation.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.value = examples[0].text;
    showCard.value = true;
    return;
  }
  run();
});
onBeforeUnmount(() => {
  alive = false;
  timers.forEach(clearTimeout);
});

const year = new Date().getFullYear();
</script>

<template>
  <div class="min-h-[100dvh] bg-white">
    <!-- Sticky header: nananatili ang Log in / Sign up habang nag-i-scroll -->
    <header class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:py-3">
        <RouterLink to="/" class="flex items-center gap-2 py-1 text-lg font-bold text-indigo-700 sm:text-xl">
          <CalendarCheck class="h-6 w-6 shrink-0" aria-hidden="true" /> AyosKo
        </RouterLink>
      </div>
    </header>

    <main>
      <!-- Hero -->
      <section class="bg-[radial-gradient(48rem_26rem_at_75%_-5%,theme(colors.indigo.100),transparent)]">
        <div class="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:gap-10 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div>
            <h1 class="text-[2rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
              Ayusin ang buhay mo, sa isang lugar.
            </h1>
            <p class="mt-4 max-w-lg text-base text-slate-600 sm:mt-5 sm:text-lg">
              Tasks, bills, appointments, and documents, with a reminder before each one is due.
              Just type what you need to remember, in Filipino or English.
            </p>
            <div class="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <RouterLink to="/register" class="btn-primary w-full px-6 py-3 text-base sm:w-auto">Get started free</RouterLink>
              <RouterLink to="/login" class="btn-ghost w-full px-6 py-3 text-base sm:w-auto">Log in</RouterLink>
            </div>
          </div>

          <!-- Life Inbox demo (dekorasyon lang, kaya aria-hidden) -->
          <div>
            <p class="sr-only">
              Example: typing “Bayaran ang internet sa November 15” in Life Inbox creates a bill due November 15,
              and you confirm the details before it is saved.
            </p>
            <div aria-hidden="true" class="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-indigo-900/5 min-[380px]:p-4 sm:p-5">
              <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles class="h-4 w-4 text-indigo-600" /> Life Inbox
              </div>

              <div class="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3">
                <!-- Dalawang linya ang nakareserba sa phone para hindi tumalon ang layout kapag nag-wrap ang tina-type -->
                <p class="min-h-[3rem] flex-1 break-words text-base leading-6 text-slate-900 sm:min-h-[1.5rem]">
                  <span v-if="typed">{{ typed }}</span>
                  <span v-else class="text-slate-400">Type something to remember…</span>
                  <span class="ml-0.5 inline-block h-5 w-px translate-y-1 animate-pulse bg-indigo-600"></span>
                </p>
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white"><Send class="h-4 w-4" /></span>
              </div>

              <!-- Nakareserba ang taas para hindi tumalon ang layout -->
              <div class="mt-3 min-h-[10.5rem] sm:min-h-[8.5rem]">
                <Transition name="rise">
                  <div v-if="showCard" :key="idx" class="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div class="flex items-start gap-3">
                      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg" :class="examples[idx].tile">
                        <component :is="examples[idx].icon" class="h-5 w-5" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p class="font-semibold text-slate-900">{{ examples[idx].title }}</p>
                          <span class="badge badge-info">{{ examples[idx].kind }}</span>
                        </div>
                        <p class="mt-0.5 text-sm text-slate-600">{{ examples[idx].when }}</p>
                        <p class="mt-1 flex items-center gap-1 text-xs text-slate-500"><Bell class="h-3.5 w-3.5 shrink-0" /> {{ examples[idx].note }}</p>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 pt-3 sm:justify-end">
                      <span class="text-xs text-slate-500">Check the details, then save</span>
                      <span class="btn-primary btn-sm pointer-events-none"><Check class="h-4 w-4" /> Confirm</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Ano ang sinusubaybayan -->
      <section class="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <h2 class="max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Everything with a date, kept together.
        </h2>
        <!-- Phone: icon sa kaliwa, teksto sa kanan (mas maikli ang scroll). Tablet pataas: nakatayong card. -->
        <div class="mt-8 grid gap-x-8 gap-y-6 sm:mt-10 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
          <div v-for="a in areas" :key="a.title" class="flex gap-4 border-t border-slate-200 pt-5 sm:block">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg" :class="a.tile">
              <component :is="a.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <h3 class="font-semibold text-slate-900 sm:mt-4">{{ a.title }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ a.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Privacy -->
      <section class="mx-auto max-w-6xl px-4 pb-12 sm:pb-20">
        <div class="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
            <ShieldCheck class="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Only you can see your records.</h2>
            <p class="mt-1 max-w-2xl text-slate-600">
              Every task, bill, and file is locked to your account at the database level (Row Level Security),
              so nobody else can open it.
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:gap-3 sm:py-8 sm:text-left">
        <img :src="logo" alt="AyosKo - Plan Better. Live Brighter." class="h-12 w-12 object-contain mix-blend-multiply sm:h-16 sm:w-16" />
        <p class="text-sm text-slate-500">© {{ year }} AyosKo. Plan Better. Live Brighter.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.rise-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.rise-leave-active { transition: opacity 0.2s ease; }
.rise-enter-from { opacity: 0; transform: translateY(8px); }
.rise-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .rise-enter-active, .rise-leave-active { transition: none; }
  .rise-enter-from { transform: none; }
}
</style>