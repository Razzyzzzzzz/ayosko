<script setup>
import { ref, reactive, computed } from 'vue';
import { ShieldPlus, Phone, Pencil, Plus, Trash2, Lock, Copy } from 'lucide-vue-next';
import ConfirmDialog from '../ConfirmDialog.vue';
import LbHeader from './LbHeader.vue';
import { api } from '../../lib/api';
import { useLifeBox } from '../../stores/lifeboxStore';
import { useToast } from '../../stores/toast';
import { BLOOD_TYPES, emergencyCompleteness, telHref } from '../../lib/lifebox';

const lb = useLifeBox(); const toast = useToast();
const info = computed(() => lb.emergency);
const editing = ref(false); const saving = ref(false); const clearOpen = ref(false); const error = ref('');
const f = reactive({ blood_type: '', allergies: '', conditions: '', medications: '', doctor_name: '', doctor_phone: '', hmo_name: '', hmo_number: '', preferred_hospital: '', notes: '', contacts: [] });
const pct = computed(() => emergencyCompleteness(info.value));
const MED = [['blood_type', 'Blood Type'], ['allergies', 'Allergies'], ['conditions', 'Conditions'], ['medications', 'Medications'], ['notes', 'Medical Notes']];
const TEXTS = [['allergies', 'Allergies'], ['conditions', 'Medical conditions'], ['medications', 'Current medications']];
const nn = (v) => String(v ?? '').trim() || null;

function edit() {
  const i = info.value ?? {};
  Object.assign(f, { blood_type: i.blood_type ?? '', allergies: i.allergies ?? '', conditions: i.conditions ?? '', medications: i.medications ?? '', doctor_name: i.doctor_name ?? '', doctor_phone: i.doctor_phone ?? '', hmo_name: i.hmo_name ?? '', hmo_number: i.hmo_number ?? '', preferred_hospital: i.preferred_hospital ?? '', notes: i.notes ?? '', contacts: (i.contacts ?? []).map((c) => ({ name: c.name, relationship: c.relationship ?? '', phone: c.phone })) });
  if (!f.contacts.length) f.contacts.push({ name: '', relationship: '', phone: '' });
  error.value = ''; editing.value = true;
}
const addContact = () => f.contacts.length < 5 && f.contacts.push({ name: '', relationship: '', phone: '' });
async function save() {
  error.value = '';
  const contacts = f.contacts.filter((c) => c.name.trim() || c.phone.trim());
  if (contacts.some((c) => !c.name.trim() || !c.phone.trim())) return (error.value = 'Each contact needs a name and a phone number.');
  saving.value = true;
  try {
    await api('/lifebox/emergency', { method: 'PUT', body: { blood_type: f.blood_type || null, allergies: nn(f.allergies), conditions: nn(f.conditions), medications: nn(f.medications), doctor_name: nn(f.doctor_name), doctor_phone: nn(f.doctor_phone), hmo_name: nn(f.hmo_name), hmo_number: nn(f.hmo_number), preferred_hospital: nn(f.preferred_hospital), notes: nn(f.notes), contacts: contacts.map((c) => ({ name: c.name.trim(), relationship: nn(c.relationship), phone: c.phone.trim() })) } });
    toast.success('Emergency card saved.'); editing.value = false; await lb.refresh();
  } catch (e) { error.value = e.details?.[0]?.message || e.message; } finally { saving.value = false; }
}
async function clearAll() {
  try { await api('/lifebox/emergency', { method: 'DELETE' }); toast.success('Emergency card cleared.'); clearOpen.value = false; await lb.refresh(); } catch (e) { toast.error(e.message); clearOpen.value = false; }
}
async function copy() {
  const i = info.value; const L = [];
  for (const [k, l] of MED) if (i[k]) L.push(`${l}: ${i[k]}`);
  if (i.doctor_name) L.push(`Doctor: ${i.doctor_name}${i.doctor_phone ? ` (${i.doctor_phone})` : ''}`);
  if (i.hmo_name || i.hmo_number) L.push(`HMO: ${[i.hmo_name, i.hmo_number].filter(Boolean).join(' · ')}`);
  if (i.preferred_hospital) L.push(`Preferred hospital: ${i.preferred_hospital}`);
  for (const c of i.contacts ?? []) L.push(`Contact: ${c.name}${c.relationship ? ` (${c.relationship})` : ''} ${c.phone}`);
  try { await navigator.clipboard.writeText(L.join('\n')); toast.success('Copied.'); } catch { toast.error('Couldn’t copy. Select the text instead.'); }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <LbHeader title="Emergency Card" />
    <section class="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 p-5 text-white shadow-lg">
      <ShieldPlus class="h-14 w-14 shrink-0 text-white/90" /><div class="min-w-0 flex-1"><h2 class="text-lg font-bold">Emergency Information</h2><p class="text-sm text-indigo-100">Quick access to your important contacts and details.</p></div>
      <button v-if="info && !editing" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20" aria-label="Copy details" @click="copy"><Copy class="h-5 w-5" /></button>
    </section>

    <div v-if="!info && !editing" class="card py-12 text-center"><p class="font-medium">Set up your emergency card</p><p class="mx-auto mb-4 mt-1 max-w-xs text-sm text-slate-500">Blood type, allergies, medications and who to call. Keep it ready for when it matters most.</p><button class="btn-primary" @click="edit"><Plus class="h-4 w-4" /> Set up</button></div>

    <template v-else-if="!editing">
      <section class="mb-5">
        <div class="mb-2 flex items-center justify-between"><h2 class="font-semibold">Emergency Contacts</h2><button class="text-sm font-medium text-indigo-600" @click="edit">Edit</button></div>
        <p v-if="!info.contacts?.length" class="card text-sm text-slate-500">No contacts yet. Tap Edit to add one.</p>
        <ul v-else class="card divide-y !p-0">
          <li v-for="(c, i) in info.contacts" :key="i"><a :href="telHref(c.phone)" class="flex min-h-[68px] items-center gap-3 p-3 hover:bg-slate-50"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Phone class="h-5 w-5" /></span><span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ c.name }}<span v-if="c.relationship" class="font-normal text-slate-500"> · {{ c.relationship }}</span></span><span class="text-sm text-slate-600">{{ c.phone }}</span></span><span :class="['badge shrink-0', i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600']">{{ i === 0 ? 'Primary' : 'Secondary' }}</span></a></li>
        </ul>
      </section>

      <section class="mb-5">
        <div class="mb-2 flex items-center justify-between"><h2 class="font-semibold">Medical Information</h2><button class="text-sm font-medium text-indigo-600" @click="edit">Edit</button></div>
        <dl class="card divide-y !p-0 text-sm">
          <div v-for="[k, l] in MED" :key="k" class="flex items-start justify-between gap-4 p-3"><dt class="text-slate-500">{{ l }}</dt><dd class="max-w-[65%] whitespace-pre-line break-words text-right font-medium">{{ info[k] ? (k === 'blood_type' && info[k] === 'unknown' ? 'Unknown' : info[k]) : (k === 'allergies' ? 'None' : k === 'notes' ? 'No additional notes' : '—') }}</dd></div>
          <div v-if="info.doctor_name" class="flex items-start justify-between gap-4 p-3"><dt class="text-slate-500">Doctor</dt><dd class="text-right font-medium">{{ info.doctor_name }}<a v-if="info.doctor_phone" :href="telHref(info.doctor_phone)" class="block text-indigo-600">{{ info.doctor_phone }}</a></dd></div>
          <div v-if="info.hmo_name || info.hmo_number" class="flex items-start justify-between gap-4 p-3"><dt class="text-slate-500">HMO / Insurance</dt><dd class="text-right font-medium">{{ [info.hmo_name, info.hmo_number].filter(Boolean).join(' · ') }}</dd></div>
          <div v-if="info.preferred_hospital" class="flex items-start justify-between gap-4 p-3"><dt class="text-slate-500">Preferred hospital</dt><dd class="text-right font-medium">{{ info.preferred_hospital }}</dd></div>
        </dl>
        <div class="mt-3"><div class="mb-1 flex justify-between text-xs text-slate-500"><span>Card completeness</span><span>{{ pct }}%</span></div><div class="h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-indigo-500" :style="{ width: pct + '%' }" /></div></div>
      </section>
      <p class="flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800"><Lock class="h-4 w-4 shrink-0" />This information is private and only accessible to you.</p>
      <button class="mt-4 text-sm text-red-600 hover:underline" @click="clearOpen = true">Clear emergency card</button>
    </template>

    <form v-else class="card space-y-4" novalidate @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="label" for="em-bt">Blood type</label><select id="em-bt" v-model="f.blood_type" class="input"><option value="">Not set</option><option v-for="b in BLOOD_TYPES" :key="b" :value="b">{{ b === 'unknown' ? 'Unknown' : b }}</option></select></div>
        <div><label class="label" for="em-hosp">Preferred hospital</label><input id="em-hosp" v-model="f.preferred_hospital" class="input" maxlength="150" /></div>
        <div v-for="[k, l] in TEXTS" :key="k" class="sm:col-span-2"><label class="label" :for="`em-${k}`">{{ l }}</label><textarea :id="`em-${k}`" v-model="f[k]" rows="2" class="input" maxlength="500" /></div>
        <div><label class="label" for="em-dn">Doctor</label><input id="em-dn" v-model="f.doctor_name" class="input" maxlength="100" /></div>
        <div><label class="label" for="em-dp">Doctor phone</label><input id="em-dp" v-model="f.doctor_phone" type="tel" class="input" maxlength="30" /></div>
        <div><label class="label" for="em-hn">HMO / insurance</label><input id="em-hn" v-model="f.hmo_name" class="input" maxlength="100" /></div>
        <div><label class="label" for="em-hno">Member number</label><input id="em-hno" v-model="f.hmo_number" class="input" maxlength="60" autocomplete="off" /></div>
        <div class="sm:col-span-2"><label class="label" for="em-notes">Medical notes</label><textarea id="em-notes" v-model="f.notes" rows="2" class="input" maxlength="1000" /></div>
      </div>
      <div>
        <div class="mb-2 flex items-center justify-between"><p class="label !mb-0">Emergency contacts ({{ f.contacts.length }}/5)</p><button v-if="f.contacts.length < 5" type="button" class="min-h-[36px] text-sm font-medium text-indigo-600" @click="addContact">+ Add contact</button></div>
        <p class="mb-2 text-xs text-slate-500">The first contact is your Primary contact.</p>
        <div class="space-y-3"><div v-for="(c, i) in f.contacts" :key="i" class="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.2fr_1fr_1.2fr_auto]">
          <input v-model="c.name" class="input col-span-2 sm:col-span-1" placeholder="Name" :aria-label="`Contact ${i + 1} name`" maxlength="80" />
          <input v-model="c.relationship" class="input" placeholder="Relationship" :aria-label="`Contact ${i + 1} relationship`" maxlength="40" />
          <input v-model="c.phone" type="tel" class="input" placeholder="Phone" :aria-label="`Contact ${i + 1} phone`" maxlength="30" />
          <button type="button" class="btn-ghost !px-3 text-red-600" :aria-label="`Remove contact ${i + 1}`" @click="f.contacts.splice(i, 1)"><Trash2 class="h-4 w-4" /></button>
        </div></div>
      </div>
      <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="editing = false">Cancel</button><button class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save card' }}</button></div>
    </form>
    <ConfirmDialog :open="clearOpen" confirm-label="Clear" message="Remove all emergency information? This cannot be undone." @cancel="clearOpen = false" @confirm="clearAll" />
  </div>
</template>
