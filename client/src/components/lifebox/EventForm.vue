<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ImagePlus, X } from 'lucide-vue-next';
import ConfirmDialog from '../ConfirmDialog.vue';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { prepareFile, todayLocal } from '../../lib/lifebox';

const props = defineProps({ id: String });
const lb = useLifeBox(); const toast = useToast(); const router = useRouter();
const isNew = computed(() => props.id === 'new');
const existing = computed(() => (isNew.value ? null : lb.events.find((e) => e.id === props.id) ?? null));
const f = reactive({ title: '', event_date: todayLocal(), description: '' });
const photo = ref(null); const preview = ref(''); const photoError = ref(''); const saving = ref(false); const error = ref(''); const delOpen = ref(false); let filled = false;
const shown = computed(() => preview.value || existing.value?.photo_url || '');

const clearPreview = () => { if (preview.value) URL.revokeObjectURL(preview.value); preview.value = ''; };
onBeforeUnmount(clearPreview);
function fill() { const e = existing.value; if (filled || !e) return; filled = true; Object.assign(f, { title: e.title, event_date: e.event_date, description: e.description ?? '' }); }
onMounted(async () => { if (!lb.loaded) await lb.load(); fill(); }); watch(existing, fill);

async function pick(ev) {
  const raw = ev.target.files?.[0]; ev.target.value = ''; if (!raw) return; photoError.value = ''; clearPreview();
  try { photo.value = await prepareFile(raw, { imagesOnly: true, limit: 5 * 1048576 }); preview.value = URL.createObjectURL(photo.value); }
  catch (e) { photo.value = null; photoError.value = e.message; }
}
function removePhoto() { photo.value = null; clearPreview(); }

async function save() {
  error.value = '';
  if (!f.title.trim()) return (error.value = 'Please enter a title.');
  if (!f.event_date) return (error.value = 'Please choose a date.');
  saving.value = true;
  try {
    const body = { title: f.title.trim(), event_date: f.event_date, description: f.description.trim() || null };
    const saved = (await api(isNew.value ? '/lifebox/events' : `/lifebox/events/${props.id}`, { method: isNew.value ? 'POST' : 'PATCH', body })).data;
    if (photo.value) {
      const fd = new FormData(); fd.append('photo', photo.value);
      try { await api(`/lifebox/events/${saved.id}/photo`, { method: 'POST', form: fd }); }
      catch (e) { toast.error(`Saved, but the photo didn’t upload: ${e.message}`); }
    }
    toast.success('Moment saved.'); await lb.refresh(); router.replace('/app/lifebox/timeline');
  } catch (e) { error.value = e.details?.[0]?.message || e.message; } finally { saving.value = false; }
}
async function remove() {
  try { await api(`/lifebox/events/${props.id}`, { method: 'DELETE' }); toast.success('Moment deleted.'); await lb.refresh(); router.replace('/app/lifebox/timeline'); } catch (e) { toast.error(e.message); delOpen.value = false; }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <LbHeader :title="isNew ? 'Add Life Event' : 'Edit Life Event'" to="/app/lifebox/timeline" />
    <p v-if="!isNew && !existing && lb.loaded" class="card py-8 text-center text-sm text-slate-500">This moment no longer exists.</p>
    <form v-else class="space-y-4" novalidate @submit.prevent="save">
      <div><label class="label" for="ev-title">Title</label><input id="ev-title" v-model="f.title" class="input" maxlength="120" placeholder="e.g. Graduation" /></div>
      <div><label class="label" for="ev-date">Date</label><input id="ev-date" v-model="f.event_date" type="date" class="input" /></div>
      <div><label class="label" for="ev-desc">Description (optional)</label><textarea id="ev-desc" v-model="f.description" rows="3" class="input" maxlength="1000" placeholder="What made it special?" /></div>
      <div>
        <p class="label">Photo (optional)</p>
        <div v-if="shown" class="relative"><img :src="shown" alt="Event photo" class="max-h-64 w-full rounded-2xl object-cover" /><button v-if="photo" type="button" class="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Remove new photo" @click="removePhoto"><X class="h-5 w-5" /></button></div>
        <label class="btn-ghost mt-2 w-full cursor-pointer"><ImagePlus class="h-4 w-4" /> {{ shown ? 'Change photo' : 'Add a photo' }}<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="pick" /></label>
        <p v-if="photoError" class="mt-2 text-sm text-red-600" role="alert">{{ photoError }}</p>
      </div>
      <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <button class="btn-primary w-full !min-h-[52px] text-base" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      <button v-if="!isNew" type="button" class="btn-ghost w-full text-red-600" @click="delOpen = true">Delete this moment</button>
    </form>
    <ConfirmDialog :open="delOpen" message="Delete this moment and its photo? This cannot be undone." @cancel="delOpen = false" @confirm="remove" />
  </div>
</template>
