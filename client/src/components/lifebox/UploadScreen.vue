<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UploadCloud, Camera, Image as ImageIcon, FileText, X, ChevronDown } from 'lucide-vue-next';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { DOC_CATEGORIES, REMIND_OPTIONS, prepareFile, fileKind, fmtSize } from '../../lib/lifebox';

const props = defineProps({ id: { type: String, default: '' } });
const lb = useLifeBox(); const toast = useToast(); const router = useRouter(); const route = useRoute();
const doc = computed(() => (props.id ? lb.docById(props.id) : null));
const f = reactive({ name: '', category: 'ids', expires_on: '', renewal_remind_days: 30, document_number: '', reference_notes: '' });
const file = ref(null); const thumb = ref(''); const fileError = ref(''); const errors = ref([]); const saving = ref(false); const dragging = ref(false); const more = ref(false);
const created = ref(null); let filled = false;
const existingId = computed(() => props.id || created.value?.id || '');
const REAL = DOC_CATEGORIES.map((c) => c.key);

const clearThumb = () => { if (thumb.value) URL.revokeObjectURL(thumb.value); thumb.value = ''; };
onBeforeUnmount(clearThumb);
function fill() {
  const d = doc.value; if (filled && !d) return; if (props.id && !d) return; filled = true;
  if (d) { Object.assign(f, { name: d.name, category: REAL.includes(d.category) ? d.category : 'other', expires_on: d.expires_on ?? '', renewal_remind_days: d.renewal_remind_days ?? 30, document_number: d.document_number ?? '', reference_notes: d.reference_notes ?? '' }); more.value = !!(d.document_number || d.reference_notes); }
  else if (REAL.includes(route.query.c)) f.category = route.query.c;
}
async function setFile(raw) {
  if (!raw) return; fileError.value = ''; clearThumb();
  try {
    file.value = await prepareFile(raw);
    if (fileKind(file.value.name) === 'image') thumb.value = URL.createObjectURL(file.value);
    if (!f.name.trim()) f.name = file.value.name.replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').slice(0, 100);
  } catch (e) { file.value = null; fileError.value = e.message; }
}
onMounted(async () => { if (!lb.loaded) await lb.load(); fill(); const p = lb.takePending(); if (p) await setFile(p); });
watch(doc, fill);
const onPick = (e) => { const x = e.target.files?.[0]; e.target.value = ''; setFile(x); };
const onDrop = (e) => { dragging.value = false; setFile(e.dataTransfer?.files?.[0]); };
const clearFile = () => { file.value = null; clearThumb(); };

async function save() {
  errors.value = [];
  if (!f.name.trim()) return (errors.value = [{ message: 'Please enter a document name.' }]);
  if (!existingId.value && !file.value) return (errors.value = [{ message: 'Choose or scan a file to upload.' }]);
  saving.value = true;
  try {
    const body = { name: f.name.trim(), category: f.category, expires_on: f.expires_on || null, renewal_remind_days: Number(f.renewal_remind_days) || 30, document_number: f.document_number.trim() || null, reference_notes: f.reference_notes.trim() || null };
    const id = existingId.value;
    const saved = (await api(id ? `/documents/${id}` : '/documents', { method: id ? 'PATCH' : 'POST', body })).data;
    if (!id) created.value = saved;
    if (file.value) {
      const fd = new FormData(); fd.append('file', file.value);
      try { await api(`/documents/${saved.id}/file`, { method: 'POST', form: fd }); }
      catch (e) { errors.value = [{ message: `Saved, but the file didn’t upload: ${e.message}` }]; lb.refresh(); return; }
    }
    toast.success(id && props.id ? 'Document updated.' : 'Document uploaded.');
    await lb.refresh(); router.replace(`/app/lifebox/view/${saved.id}`);
  } catch (e) { errors.value = e.details?.length ? e.details : [{ message: e.message }]; } finally { saving.value = false; }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <LbHeader :title="props.id ? 'Edit Document' : 'Upload Document'" :to="props.id ? `/app/lifebox/view/${props.id}` : '/app/lifebox/documents'" />
    <form class="space-y-5" novalidate @submit.prevent="save">
      <section>
        <div :class="['rounded-2xl border-2 border-dashed p-5 text-center transition', dragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-300 bg-white']" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
          <div v-if="file" class="flex items-center gap-3 text-left">
            <img v-if="thumb" :src="thumb" alt="Selected file preview" class="h-16 w-16 rounded-xl border object-cover" />
            <span v-else class="flex h-16 w-16 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-700">PDF</span>
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{ file.name }}</p><p class="text-xs text-slate-500">{{ fmtSize(file.size) }}</p></div>
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Remove selected file" @click="clearFile"><X class="h-5 w-5" /></button>
          </div>
          <label v-else class="block cursor-pointer"><UploadCloud class="mx-auto mb-2 h-9 w-9 text-indigo-500" /><span class="block text-sm font-medium">Tap to upload or drag and drop</span><span class="text-xs text-slate-500">Supports JPG, PNG, PDF (Max 10MB)</span><input type="file" accept=".pdf,image/jpeg,image/png,image/webp" class="sr-only" @change="onPick" /></label>
          <p v-if="props.id && doc?.file_name && !file" class="mt-3 text-xs text-slate-500">Current file: {{ doc.file_name }}. Choosing a new one replaces it.</p>
        </div>
        <p v-if="fileError" class="mt-2 text-sm text-red-600" role="alert">{{ fileError }}</p>
        <p class="mb-2 mt-4 text-sm text-slate-500">Or choose from</p>
        <div class="grid grid-cols-3 gap-3">
          <label class="card flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 !p-3 text-center transition hover:shadow-md"><Camera class="h-6 w-6 text-indigo-600" /><span class="text-xs font-medium">Camera</span><input type="file" accept="image/*" capture="environment" class="sr-only" @change="onPick" /></label>
          <label class="card flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 !p-3 text-center transition hover:shadow-md"><ImageIcon class="h-6 w-6 text-indigo-600" /><span class="text-xs font-medium">Gallery</span><input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onPick" /></label>
          <label class="card flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 !p-3 text-center transition hover:shadow-md"><FileText class="h-6 w-6 text-indigo-600" /><span class="text-xs font-medium">Files</span><input type="file" accept=".pdf,image/jpeg,image/png,image/webp" class="sr-only" @change="onPick" /></label>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-semibold">Document Details</h2>
        <div><label class="label" for="up-name">Document Name</label><input id="up-name" v-model="f.name" class="input" maxlength="200" placeholder="e.g. PhilHealth ID" /></div>
        <div><label class="label" for="up-cat">Category</label><select id="up-cat" v-model="f.category" class="input"><option v-for="c in DOC_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option></select></div>
        <div><label class="label" for="up-exp">Expiration Date (Optional)</label><input id="up-exp" v-model="f.expires_on" type="date" class="input" /></div>
        <div v-if="f.expires_on"><label class="label" for="up-rem">Remind me before it expires</label><select id="up-rem" v-model="f.renewal_remind_days" class="input"><option v-for="[v, l] in REMIND_OPTIONS.filter(([d]) => d > 0)" :key="v" :value="v">{{ l }}</option></select></div>
        <button type="button" class="flex items-center gap-1 text-sm font-medium text-indigo-600" :aria-expanded="more" @click="more = !more"><ChevronDown :class="['h-4 w-4 transition', more && 'rotate-180']" /> More details</button>
        <div v-if="more" class="space-y-4"><div><label class="label" for="up-num">Document number</label><input id="up-num" v-model="f.document_number" class="input" maxlength="60" autocomplete="off" /></div><div><label class="label" for="up-notes">Notes</label><textarea id="up-notes" v-model="f.reference_notes" rows="2" class="input" maxlength="2000" placeholder="Where the original is kept, renewal steps…" /></div></div>
      </section>

      <ul v-if="errors.length" class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert"><li v-for="(e, i) in errors" :key="i">{{ e.field ? `${e.field}: ` : '' }}{{ e.message }}</li></ul>
      <button class="btn-primary w-full !min-h-[52px] text-base" :disabled="saving">{{ saving ? 'Saving…' : created ? 'Retry upload' : props.id ? 'Save changes' : 'Upload Document' }}</button>
    </form>
  </div>
</template>
