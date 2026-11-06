<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarPlus } from 'lucide-vue-next';
import ConfirmDialog from '../ConfirmDialog.vue';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { DOC_CATEGORIES, REMIND_OPTIONS } from '../../lib/lifebox';

const props = defineProps({ id: String });
const lb = useLifeBox(); const toast = useToast(); const router = useRouter();
const isNew = computed(() => props.id === 'new');
const existing = computed(() => (isNew.value ? null : lb.reminders.find((r) => r.id === props.id) ?? null));
const f = reactive({ title: '', category: 'ids', due_on: '', remind_days: 7, notes: '' });
const saving = ref(false); const error = ref(''); const delOpen = ref(false); let filled = false;
function fill() { const r = existing.value; if (filled || !r) return; filled = true; Object.assign(f, { title: r.title, category: r.category, due_on: r.due_on, remind_days: r.remind_days, notes: r.notes ?? '' }); }
onMounted(async () => { if (!lb.loaded) await lb.load(); fill(); }); watch(existing, fill);

async function save() {
  error.value = '';
  if (!f.title.trim()) return (error.value = 'Please enter a title.');
  if (!f.due_on) return (error.value = 'Please choose a date.');
  saving.value = true;
  try {
    const body = { title: f.title.trim(), category: f.category, due_on: f.due_on, remind_days: Number(f.remind_days), notes: f.notes.trim() || null };
    await api(isNew.value ? '/lifebox/reminders' : `/lifebox/reminders/${props.id}`, { method: isNew.value ? 'POST' : 'PATCH', body });
    toast.success('Reminder saved.'); await lb.refresh(); router.replace('/app/lifebox/reminders');
  } catch (e) { error.value = e.details?.[0]?.message || e.message; } finally { saving.value = false; }
}
async function remove() {
  try { await api(`/lifebox/reminders/${props.id}`, { method: 'DELETE' }); toast.success('Reminder deleted.'); await lb.refresh(); router.replace('/app/lifebox/reminders'); } catch (e) { toast.error(e.message); delOpen.value = false; }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <LbHeader :title="isNew ? 'Add Reminder' : 'Edit Reminder'" to="/app/lifebox/reminders" />
    <div class="mb-5 text-center"><span class="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><CalendarPlus class="h-8 w-8" /></span><h2 class="text-lg font-bold">Create a Reminder</h2><p class="text-sm text-slate-500">Set a reminder for an important date or document expiration.</p></div>
    <p v-if="!isNew && !existing && lb.loaded" class="card py-8 text-center text-sm text-slate-500">This reminder no longer exists.</p>
    <form v-else class="space-y-4" novalidate @submit.prevent="save">
      <div><label class="label" for="rm-title">Title</label><input id="rm-title" v-model="f.title" class="input" maxlength="120" placeholder="e.g. Driver’s License Renewal" /></div>
      <div><label class="label" for="rm-cat">Category</label><select id="rm-cat" v-model="f.category" class="input"><option v-for="c in DOC_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option></select></div>
      <div><label class="label" for="rm-date">Date</label><input id="rm-date" v-model="f.due_on" type="date" class="input" /></div>
      <div><label class="label" for="rm-days">Remind me</label><select id="rm-days" v-model="f.remind_days" class="input"><option v-for="[v, l] in REMIND_OPTIONS" :key="v" :value="v">{{ l }}</option></select></div>
      <div><label class="label" for="rm-notes">Notes (optional)</label><textarea id="rm-notes" v-model="f.notes" rows="2" class="input" maxlength="1000" /></div>
      <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <button class="btn-primary w-full !min-h-[52px] text-base" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      <button v-if="!isNew" type="button" class="btn-ghost w-full text-red-600" @click="delOpen = true">Delete reminder</button>
    </form>
    <ConfirmDialog :open="delOpen" message="Delete this reminder? This cannot be undone." @cancel="delOpen = false" @confirm="remove" />
  </div>
</template>
