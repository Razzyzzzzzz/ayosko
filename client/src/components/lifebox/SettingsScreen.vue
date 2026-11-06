<script setup>
import { ref, computed, onMounted } from 'vue';
import { ShieldCheck, Bell, HardDrive, CloudUpload, LifeBuoy, ChevronDown, Lock, Download } from 'lucide-vue-next';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { DOC_CATEGORIES, catOf, fmtSize, maskNumbers, setMaskNumbers, STORAGE_LIMIT_BYTES } from '../../lib/lifebox';

const lb = useLifeBox(); const toast = useToast();
const open = ref(''); const mask = ref(maskNumbers()); const alerts = ref(true); const alertsReady = ref(false);
const toggle = (k) => { open.value = open.value === k ? '' : k; };
onMounted(async () => { try { const p = (await api('/profile')).data.preferences; alerts.value = p?.documents !== false; alertsReady.value = true; } catch { /* toggle stays disabled */ } });

function onMask(e) { mask.value = e.target.checked; setMaskNumbers(mask.value); toast.success(mask.value ? 'Document numbers are hidden by default.' : 'Document numbers are shown.'); }
async function onAlerts(e) {
  const v = e.target.checked;
  try { await api('/profile/preferences', { method: 'PATCH', body: { documents: v } }); alerts.value = v; toast.success(v ? 'Expiry alerts are on.' : 'Expiry alerts are off.'); }
  catch (err) { e.target.checked = alerts.value; toast.error(err.message); }
}
const used = computed(() => lb.docs.reduce((s, d) => s + (d.file_size || 0), 0) + lb.events.reduce((s, e) => s + (e.photo_size || 0), 0));
const pct = computed(() => Math.min(100, (used.value / STORAGE_LIMIT_BYTES) * 100));
const byCat = computed(() => DOC_CATEGORIES.map((c) => ({ ...c, bytes: lb.docs.filter((d) => (d.category || 'other') === c.key).reduce((s, d) => s + (d.file_size || 0), 0) })).filter((c) => c.bytes));
const files = computed(() => lb.docs.filter((d) => d.file_path).length + lb.events.filter((e) => e.photo_path).length);

function exportData() {
  const data = { exported_at: new Date().toISOString(), note: 'Metadata only. Files stay in your private storage.',
    documents: lb.docs.map(({ id, name, category, document_number, expires_on, renewal_remind_days, reference_notes, file_name, file_size, created_at }) => ({ id, name, category, document_number, expires_on, renewal_remind_days, reference_notes, file_name, file_size, created_at })),
    reminders: lb.reminders, timeline: lb.events.map(({ photo_url, ...e }) => e), emergency: lb.emergency };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `lifebox-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success('Backup downloaded.');
}
const FAQ = [['What can I upload?', 'PDF, JPG, PNG or WEBP files up to 10 MB. Large photos are shrunk automatically.'], ['How does scanning work?', 'Scan Document opens your camera. Line up the page inside the frame and tap the shutter. Add more pages and they’re combined into one PDF.'], ['Who can see my files?', 'Only you. Files are kept in a private bucket and opened with links that expire after a minute.'], ['How do reminders work?', 'Documents with an expiry date and your custom reminders send an in-app notification before the date. Turn this on or off under Notification Preferences.']];
const ROWS = [['privacy', ShieldCheck, 'Security & Privacy', 'Manage your data and access'], ['alerts', Bell, 'Notification Preferences', 'Reminder and alert settings'], ['storage', HardDrive, 'Storage Usage', 'View your storage usage'], ['backup', CloudUpload, 'Backup & Sync', 'Keep your files safe'], ['help', LifeBuoy, 'Help & Support', 'Get help with LifeBox']];
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <LbHeader title="LifeBox Settings" />
    <div class="card divide-y !p-0">
      <section v-for="[k, icon, title, sub] in ROWS" :key="k">
        <button class="flex min-h-[68px] w-full items-center gap-3 p-3 text-left hover:bg-slate-50" :aria-expanded="open === k" @click="toggle(k)"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><component :is="icon" class="h-5 w-5" /></span><span class="min-w-0 flex-1"><span class="block font-medium">{{ title }}</span><span class="text-xs text-slate-500">{{ sub }}</span></span><ChevronDown :class="['h-4 w-4 text-slate-400 transition', open === k && 'rotate-180']" /></button>

        <div v-if="open === k && k === 'privacy'" class="space-y-3 bg-slate-50 p-4 text-sm">
          <label class="flex min-h-[44px] cursor-pointer items-center justify-between gap-3"><span>Hide document numbers by default<span class="block text-xs text-slate-500">Tap the eye icon to reveal one.</span></span><input type="checkbox" :checked="mask" class="h-5 w-5 rounded" @change="onMask" /></label>
          <p class="flex items-start gap-2 text-slate-600"><Lock class="mt-0.5 h-4 w-4 shrink-0" />Your files are private to your account and open only through short-lived secure links. On a shared device, log out when you’re done.</p>
        </div>
        <div v-if="open === k && k === 'alerts'" class="space-y-2 bg-slate-50 p-4 text-sm">
          <label class="flex min-h-[44px] cursor-pointer items-center justify-between gap-3"><span>Expiry and reminder alerts<span class="block text-xs text-slate-500">In-app notifications before a document expires or a reminder is due.</span></span><input type="checkbox" :checked="alerts" :disabled="!alertsReady" class="h-5 w-5 rounded" @change="onAlerts" /></label>
          <p class="text-xs text-slate-500">Alerts appear in the app (bell icon). No push, email or SMS is sent. Set how early each one alerts when you add it.</p>
        </div>
        <div v-if="open === k && k === 'storage'" class="space-y-3 bg-slate-50 p-4 text-sm">
          <div><div class="mb-1 flex justify-between"><span class="font-semibold">{{ fmtSize(used) || '0 KB' }} used</span><span class="text-slate-500">of {{ fmtSize(STORAGE_LIMIT_BYTES) }}</span></div><div class="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="Math.round(pct)" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" :style="{ width: Math.max(pct, used ? 1 : 0) + '%' }" /></div><p class="mt-1 text-xs text-slate-500">{{ files }} file{{ files === 1 ? '' : 's' }} stored. The limit shown is the Supabase Free plan; yours may differ.</p></div>
          <ul v-if="byCat.length" class="space-y-1.5"><li v-for="c in byCat" :key="c.key" class="flex items-center justify-between"><span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" :style="{ background: c.color }" />{{ catOf(c.key).label }}</span><span class="text-slate-600">{{ fmtSize(c.bytes) }}</span></li></ul>
          <p v-else class="text-slate-500">Nothing uploaded yet.</p>
        </div>
        <div v-if="open === k && k === 'backup'" class="space-y-3 bg-slate-50 p-4 text-sm">
          <p class="text-slate-600">Your LifeBox lives in the cloud, so it syncs to every device you log in on. For your own copy, download a backup of your details (names, dates, reminders, timeline, emergency card). Files stay in private storage.</p>
          <button class="btn-primary" @click="exportData"><Download class="h-4 w-4" /> Download backup (JSON)</button>
        </div>
        <div v-if="open === k && k === 'help'" class="divide-y bg-slate-50 text-sm"><details v-for="[q, a] in FAQ" :key="q" class="group p-4"><summary class="cursor-pointer font-medium">{{ q }}</summary><p class="mt-2 text-slate-600">{{ a }}</p></details></div>
      </section>
    </div>
    <section class="mt-5 rounded-2xl bg-indigo-50 p-5 text-center"><ShieldCheck class="mx-auto mb-2 h-8 w-8 text-indigo-600" /><h2 class="font-semibold">Your privacy matters</h2><p class="mx-auto mt-1 max-w-xs text-sm text-slate-600">Your data is stored securely with Supabase and is only accessible to you.</p></section>
  </div>
</template>
