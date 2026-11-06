<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Download, Pencil, Trash2, MoreHorizontal, Eye, EyeOff, FileText, ExternalLink } from 'lucide-vue-next';
import BaseModal from '../BaseModal.vue';
import ConfirmDialog from '../ConfirmDialog.vue';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { catOf, expiryStatus, STATE_STYLE, STATE_WORD, fmtSize, fileKind, mimeOf, extOf, mask, maskNumbers } from '../../lib/lifebox';
import { iconOf } from '../../lib/lbIcons';

const props = defineProps({ id: String });
const lb = useLifeBox(); const toast = useToast(); const router = useRouter();
const doc = computed(() => lb.docById(props.id));
const st = computed(() => (doc.value ? expiryStatus(doc.value.expires_on, doc.value.renewal_remind_days) : null));
const kind = computed(() => (doc.value?.file_name ? fileKind(doc.value.file_name) : null));
const src = ref(''); const loading = ref(false); const error = ref(''); let blobUrl = '';
const renameOpen = ref(false); const newName = ref(''); const moreOpen = ref(false); const delOpen = ref(false); const busy = ref(false); const reveal = ref(false);

const cleanup = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = ''; src.value = ''; error.value = ''; };
onBeforeUnmount(cleanup);
// Private bucket: get a 60-second link from the API, then load the bytes into a local blob for in-app preview.
watch(() => [doc.value?.id, doc.value?.file_path], async ([id, path]) => {
  cleanup(); if (!id || !path) return;
  loading.value = true;
  try {
    const { data } = await api(`/documents/${id}/file`);
    const res = await fetch(data.url); if (!res.ok) throw new Error('Could not load the file.');
    blobUrl = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: mimeOf(doc.value.file_name) || 'application/octet-stream' })); src.value = blobUrl;
  } catch (e) { error.value = e.message; } finally { loading.value = false; }
}, { immediate: true });

function openRename() { newName.value = doc.value.name; renameOpen.value = true; }
async function rename() {
  const n = newName.value.trim(); if (!n) return toast.error('Enter a name.');
  busy.value = true;
  try { await api(`/documents/${doc.value.id}`, { method: 'PATCH', body: { name: n } }); toast.success('Renamed.'); renameOpen.value = false; await lb.refresh(); }
  catch (e) { toast.error(e.message); } finally { busy.value = false; }
}
async function remove() {
  busy.value = true;
  try { await api(`/documents/${doc.value.id}`, { method: 'DELETE' }); toast.success('Document deleted.'); await lb.refresh(); router.replace('/app/lifebox/documents'); }
  catch (e) { toast.error(e.message); delOpen.value = false; } finally { busy.value = false; }
}
const numberText = computed(() => { const n = doc.value?.document_number; return !n ? '' : (!maskNumbers() || reveal.value) ? n : mask(n); });
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <LbHeader title="Document Preview" to="/app/lifebox/documents" />
    <div v-if="!doc" class="card py-12 text-center"><p v-if="lb.loading" class="text-sm text-slate-500">Loading…</p><template v-else><p class="font-medium">Document not found</p><RouterLink to="/app/lifebox/documents" class="btn-primary mt-4">Back to documents</RouterLink></template></div>
    <template v-else>
      <section class="relative flex min-h-[16rem] items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
        <span v-if="kind" class="absolute right-3 top-3 z-10 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700">{{ kind === 'pdf' ? 'PDF' : extOf(doc.file_name).toUpperCase() }}</span>
        <p v-if="loading" class="text-sm text-slate-300">Loading securely…</p>
        <p v-else-if="error" class="px-6 text-center text-sm text-red-300" role="alert">{{ error }}</p>
        <img v-else-if="src && kind === 'image'" :src="src" :alt="doc.name" class="max-h-[60dvh] w-full object-contain" />
        <iframe v-else-if="src && kind === 'pdf'" :src="src" :title="doc.name" class="h-[60dvh] w-full bg-white" />
        <div v-else-if="!doc.file_path" class="px-6 py-10 text-center text-slate-300"><FileText class="mx-auto mb-2 h-10 w-10 opacity-60" /><p class="text-sm">No file attached yet.</p><RouterLink :to="`/app/lifebox/edit/${doc.id}`" class="btn-primary mt-3">Attach a file</RouterLink></div>
      </section>

      <section class="card mt-4 space-y-4">
        <div class="flex items-center gap-3"><span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" :style="{ background: catOf(doc.category).color }"><component :is="iconOf(doc.category)" class="h-6 w-6" /></span><div class="min-w-0"><p class="break-words text-lg font-bold leading-tight">{{ doc.name }}</p><p class="text-sm text-slate-500">{{ catOf(doc.category).single }}{{ doc.file_size ? ` · ${fmtSize(doc.file_size)}` : '' }}</p></div></div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between gap-3"><dt class="text-slate-500">Added on</dt><dd class="font-medium">{{ fmtDate(doc.created_at.slice(0, 10)) }}</dd></div>
          <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Expires on</dt><dd class="flex items-center gap-2 font-medium">{{ doc.expires_on ? fmtDate(doc.expires_on) : 'No expiry' }}<span :class="['badge', STATE_STYLE[st.state]]">{{ STATE_WORD[st.state] }}</span></dd></div>
          <div v-if="st.state !== 'none'" class="flex justify-between gap-3"><dt class="text-slate-500">Status</dt><dd class="font-medium">{{ st.label }}</dd></div>
          <div v-if="doc.document_number" class="flex items-center justify-between gap-3"><dt class="text-slate-500">Number</dt><dd class="flex items-center gap-1 font-mono font-medium">{{ numberText }}<button v-if="maskNumbers()" class="rounded p-2 text-slate-500 hover:bg-slate-100" :aria-label="reveal ? 'Hide number' : 'Show number'" @click="reveal = !reveal"><component :is="reveal ? EyeOff : Eye" class="h-4 w-4" /></button></dd></div>
          <div v-if="doc.reference_notes" class="pt-1"><dt class="text-slate-500">Notes</dt><dd class="whitespace-pre-line break-words">{{ doc.reference_notes }}</dd></div>
        </dl>
        <div class="grid grid-cols-4 gap-2 border-t pt-4 text-center text-xs">
          <component :is="src ? 'a' : 'button'" :href="src || undefined" :download="src ? doc.file_name : undefined" :disabled="!src" class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl hover:bg-slate-50 disabled:opacity-40"><Download class="h-5 w-5 text-indigo-600" />Download</component>
          <button class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl hover:bg-slate-50" @click="openRename"><Pencil class="h-5 w-5 text-indigo-600" />Rename</button>
          <button class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl hover:bg-slate-50" @click="delOpen = true"><Trash2 class="h-5 w-5 text-red-600" />Delete</button>
          <button class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl hover:bg-slate-50" @click="moreOpen = true"><MoreHorizontal class="h-5 w-5 text-slate-600" />More</button>
        </div>
      </section>
      <p class="mt-3 text-center text-xs text-slate-500">Only you can open this file. Links expire after a minute.</p>
    </template>

    <BaseModal :open="renameOpen" title="Rename document" @close="renameOpen = false"><form class="space-y-4" @submit.prevent="rename"><input v-model="newName" class="input" maxlength="200" aria-label="Document name" /><div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="renameOpen = false">Cancel</button><button class="btn-primary" :disabled="busy">Save</button></div></form></BaseModal>
    <BaseModal :open="moreOpen" title="More" @close="moreOpen = false"><div class="space-y-2"><RouterLink :to="`/app/lifebox/edit/${doc?.id}`" class="btn-ghost w-full justify-start" @click="moreOpen = false"><Pencil class="h-4 w-4" /> Edit details or replace file</RouterLink><a v-if="src && kind === 'pdf'" :href="src" target="_blank" rel="noopener" class="btn-ghost w-full justify-start" @click="moreOpen = false"><ExternalLink class="h-4 w-4" /> Open in new tab</a><button class="btn-ghost w-full" @click="moreOpen = false">Close</button></div></BaseModal>
    <ConfirmDialog :open="delOpen" :busy="busy" :message="`Delete “${doc?.name}”${doc?.file_name ? ' and its file' : ''}? This cannot be undone.`" @cancel="delOpen = false" @confirm="remove" />
  </div>
</template>
