<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import HomeScreen from '../components/lifebox/HomeScreen.vue';
import DocumentsScreen from '../components/lifebox/DocumentsScreen.vue';
import UploadScreen from '../components/lifebox/UploadScreen.vue';
import ViewerScreen from '../components/lifebox/ViewerScreen.vue';
import ScannerScreen from '../components/lifebox/ScannerScreen.vue';
import RemindersScreen from '../components/lifebox/RemindersScreen.vue';
import ReminderForm from '../components/lifebox/ReminderForm.vue';
import EmergencyScreen from '../components/lifebox/EmergencyScreen.vue';
import TimelineScreen from '../components/lifebox/TimelineScreen.vue';
import EventForm from '../components/lifebox/EventForm.vue';
import SettingsScreen from '../components/lifebox/SettingsScreen.vue';
import { useLifeBox } from '../stores/lifeboxStore';

const route = useRoute(); const router = useRouter(); const lb = useLifeBox();
const section = computed(() => route.params.section || 'home'); const id = computed(() => route.params.id || '');
onMounted(() => lb.ensureFresh()); // cached data shows instantly; refreshed quietly when older than 30s

const screen = computed(() => ({
  home: HomeScreen, documents: DocumentsScreen, view: ViewerScreen, upload: UploadScreen, edit: UploadScreen,
  reminders: id.value ? ReminderForm : RemindersScreen, emergency: EmergencyScreen, timeline: id.value ? EventForm : TimelineScreen, settings: SettingsScreen,
}[section.value] ?? HomeScreen));
// Floating "+": direct "add" on list screens (none on Home)
const fab = computed(() => {
  if (id.value && section.value !== 'documents') return null;
  return { documents: { to: 'upload', label: 'Upload document' }, reminders: { to: 'reminders/new', label: 'Add reminder' }, timeline: { to: 'timeline/new', label: 'Add life event' } }[section.value] ?? null;
});
// Only the screens that take an :id get one (avoids stray attributes on the others)
const idProps = computed(() => (id.value && ['view', 'edit', 'reminders', 'timeline'].includes(section.value) ? { id: id.value } : {}));
const onFab = () => router.push(`/app/lifebox/${fab.value.to}`);
</script>

<template>
  <ScannerScreen v-if="section === 'scan'" />
  <div v-else class="mx-auto max-w-5xl pb-20">
    <div v-if="!lb.loaded && lb.error" class="card py-12 text-center"><p class="font-medium text-red-700">Couldn’t load LifeBox</p><p class="mb-4 mt-1 text-sm text-slate-500">{{ lb.error }}</p><button class="btn-primary" @click="lb.refresh()">Try again</button></div>
    <p v-else-if="!lb.loaded" class="py-20 text-center text-sm text-slate-500">Opening your LifeBox…</p>
    <component :is="screen" v-else v-bind="idProps" :key="section + id" />

    <button v-if="fab && lb.loaded" class="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl transition hover:scale-105 lg:bottom-8 lg:right-8" :aria-label="fab.label" @click="onFab"><Plus class="h-7 w-7" /></button>

  </div>
</template>