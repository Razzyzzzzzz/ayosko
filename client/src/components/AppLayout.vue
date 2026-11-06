<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, Wallet, CalendarDays, CheckSquare, Bell, Receipt, CalendarClock, FileText, User, Plus, LogOut, BellRing, MoreHorizontal, Lock } from 'lucide-vue-next';
import { useAuth } from '../stores/auth';
import { api } from '../lib/api';
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';

const auth = useAuth(); const route = useRoute(); const router = useRouter();

// Desktop sidebar: all pages
const nav = [
  ['Dashboard', '/app/dashboard', LayoutDashboard], ['Money', '/app/inbox', Wallet], ['Calendar', '/app/calendar', CalendarDays],
  ['Tasks', '/app/tasks', CheckSquare], ['Reminders', '/app/reminders', Bell], ['Bills', '/app/bills', Receipt],
  ['Appointments', '/app/appointments', CalendarClock], ['Documents', '/app/documents', FileText],
  ['LifeBox', '/app/lifebox', Lock], ['Profile', '/app/profile', User],
];
// Mobile bottom bar: Dashboard, Tasks, [+], LifeBox, More
const byPath = Object.fromEntries(nav.map((n) => [n[1], n]));
const leftTabs = ['/app/dashboard', '/app/tasks'].map((p) => byPath[p]);
const rightTabs = ['/app/lifebox'].map((p) => byPath[p]);
const tabPaths = [...leftTabs, ...rightTabs].map((n) => n[1]);
const moreNav = nav.filter(([, to]) => !tabPaths.includes(to));
const quick = [['Task', 'tasks', CheckSquare], ['Reminder', 'reminders', Bell], ['Appointment', 'appointments', CalendarClock], ['Bill', 'bills', Receipt], ['Document', 'documents', FileText]];

const sheet = ref(null); // null | 'quick' | 'more'
const unread = ref(0);
let timer;

const name = computed(() => auth.profile?.full_name || 'there');
const initial = computed(() => name.value.trim().charAt(0).toUpperCase() || '?');
const moreActive = computed(() => moreNav.some(([, to]) => route.path.startsWith(to)));

async function loadUnread() {
  try { unread.value = (await api('/notifications', { params: { unread: 'true' } })).data.length; } catch { /* non-critical */ }
}
function onKey(e) { if (e.key === 'Escape') sheet.value = null; }

onMounted(() => { loadUnread(); timer = setInterval(loadUnread, 60000); window.addEventListener('keydown', onKey); });
onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener('keydown', onKey);
  document.body.classList.remove('overflow-hidden');
});
watch(() => route.fullPath, () => { sheet.value = null; loadUnread(); });
// Keep the page behind from scrolling while the bottom sheet is open (mobile only)
watch(sheet, (v) => {
  const mobile = window.matchMedia('(max-width: 1023px)').matches;
  document.body.classList.toggle('overflow-hidden', !!v && mobile);
});

const logout = async () => { sheet.value = null; await auth.signOut(); router.push('/login'); };
const add = (r) => { sheet.value = null; router.push({ path: `/app/${r}`, query: { new: Date.now() } }); };
</script>

<template>
  <div class="min-h-screen lg:flex">
    <!-- Desktop sidebar -->
    <aside class="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
      <!-- Cropped logo (heart + wordmark only, no tagline) -->
      <RouterLink to="/app/dashboard" class="mb-6 block px-2" aria-label="AyosKo dashboard">
        <span class="block h-16 w-24 overflow-hidden">
          <img :src="logo" alt="AyosKo" class="-ml-[15px] -mt-[25px] block w-[126px] max-w-none mix-blend-multiply" />
        </span>
      </RouterLink>
      <nav class="flex-1 space-y-1 overflow-y-auto" aria-label="Main">
        <RouterLink v-for="[label, to, icon] in nav" :key="to" :to="to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          active-class="!bg-indigo-100 !text-indigo-700">
          <component :is="icon" class="h-4 w-4" /> {{ label }}
        </RouterLink>
      </nav>
      <div class="mt-3 flex items-center gap-3 rounded-lg px-2 py-2">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700" aria-hidden="true">{{ initial }}</span>
        <div class="min-w-0"><p class="truncate text-sm font-medium text-slate-800">{{ name }}</p><p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p></div>
      </div>
      <button class="btn-ghost mt-2 w-full" @click="logout"><LogOut class="h-4 w-4" /> Log out</button>
    </aside>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <RouterLink to="/app/dashboard" class="block lg:hidden" aria-label="AyosKo dashboard">
          <span class="block h-11 w-16 overflow-hidden">
            <img :src="logo" alt="AyosKo" class="-ml-[10px] -mt-[17px] block w-[84px] max-w-none mix-blend-multiply" />
          </span>
        </RouterLink>
        <p class="hidden text-sm text-slate-500 lg:block">Hello, <b class="text-slate-800">{{ name }}</b></p>
        <div class="ml-auto flex items-center gap-2">
          <!-- Desktop quick add (on mobile, it's the center + in the bottom bar) -->
          <div class="relative hidden lg:block">
            <button class="btn-primary" aria-haspopup="menu" :aria-expanded="sheet === 'quick'" @click="sheet = sheet === 'quick' ? null : 'quick'"><Plus class="h-4 w-4" /> Quick add</button>
            <Transition name="fade">
              <div v-if="sheet === 'quick'" role="menu" class="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button v-for="[l, r, icon] in quick" :key="r" role="menuitem" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50" @click="add(r)">
                  <component :is="icon" class="h-4 w-4 text-indigo-600" /> New {{ l }}
                </button>
              </div>
            </Transition>
          </div>
          <RouterLink to="/app/notifications" class="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100" :aria-label="unread ? `Notifications, ${unread} unread` : 'Notifications'">
            <BellRing class="h-5 w-5" />
            <span v-if="unread" class="absolute right-0.5 top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{{ unread > 9 ? '9+' : unread }}</span>
          </RouterLink>
        </div>
      </header>
      <main class="mx-auto max-w-6xl p-4 pb-28 sm:p-6 sm:pb-28 lg:pb-6"><RouterView :key="route.path" /></main>
    </div>

    <!-- Click-outside for the desktop dropdown (outside the header because of backdrop-blur) -->
    <div v-if="sheet === 'quick'" class="fixed inset-0 z-10 hidden lg:block" @click="sheet = null" />

    <!-- Mobile bottom tab bar -->
    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
      <ul class="mx-auto flex max-w-md items-end justify-around px-2">
        <li v-for="[label, to, icon] in leftTabs" :key="to" class="flex-1">
          <RouterLink :to="to" class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500" active-class="!text-indigo-700">
            <component :is="icon" class="h-5 w-5" /> {{ label }}
          </RouterLink>
        </li>
        <li class="flex flex-1 justify-center">
          <button class="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-white" aria-label="Quick add" @click="sheet = 'quick'">
            <Plus class="h-6 w-6" />
          </button>
        </li>
        <li v-for="[label, to, icon] in rightTabs" :key="to" class="flex-1">
          <RouterLink :to="to" class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500" active-class="!text-indigo-700">
            <component :is="icon" class="h-5 w-5" /> {{ label }}
          </RouterLink>
        </li>
        <li class="flex-1">
          <button class="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium" :class="moreActive || sheet === 'more' ? 'text-indigo-700' : 'text-slate-500'" aria-haspopup="dialog" @click="sheet = 'more'">
            <MoreHorizontal class="h-5 w-5" /> More
          </button>
        </li>
      </ul>
    </nav>

    <!-- Mobile bottom sheet (Quick add / More) -->
    <Transition name="fade">
      <div v-if="sheet" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-slate-900/40" @click="sheet = null" />
        <div class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl" role="dialog" aria-modal="true" :aria-label="sheet === 'quick' ? 'Quick add' : 'More'">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />

          <template v-if="sheet === 'quick'">
            <h2 class="mb-3 text-base font-semibold">Add something</h2>
            <RouterLink to="/app/inbox" class="mb-2 flex items-center gap-3 rounded-xl bg-violet-50 p-3 text-violet-800" @click="sheet = null">
              <Wallet class="h-5 w-5 shrink-0" />
              <span><b class="block text-sm">Money</b><span class="text-xs">Payday, spending and debts</span></span>
            </RouterLink>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="[l, r, icon] in quick" :key="r" class="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-slate-200 p-3 text-left text-sm font-medium active:bg-slate-50" @click="add(r)">
                <component :is="icon" class="h-5 w-5 shrink-0 text-indigo-600" /> {{ l }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="mb-3 flex items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700" aria-hidden="true">{{ initial }}</span>
              <div class="min-w-0"><p class="truncate font-medium">{{ name }}</p><p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <RouterLink v-for="[label, to, icon] in moreNav" :key="to" :to="to" class="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 active:bg-slate-50" active-class="!border-indigo-300 !bg-indigo-50 !text-indigo-700" @click="sheet = null">
                <component :is="icon" class="h-5 w-5 shrink-0" /> {{ label }}
              </RouterLink>
            </div>
            <button class="btn-ghost mt-3 w-full" @click="logout"><LogOut class="h-4 w-4" /> Log out</button>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>