import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../lib/api';

// Shared LifeBox data. Screens are separate routes, so the data lives here and stays instant between screens.
export const useLifeBox = defineStore('lifebox', () => {
  const docs = ref([]); const reminders = ref([]); const events = ref([]); const emergency = ref(null);
  const loaded = ref(false); const loading = ref(false); const error = ref('');
  let loadedAt = 0; const pending = ref(null); // a File handed from the scanner to the upload screen
  let again = false;

  async function load(force = false) {
    if (loading.value) { if (force) again = true; return; }
    if (loaded.value && !force) return;
    loading.value = true; error.value = '';
    try {
      const [d, r, e, em] = await Promise.all([
        api('/documents', { params: { sort: 'created_at', dir: 'desc', limit: 200 } }),
        api('/lifebox/reminders', { params: { limit: 200 } }),
        api('/lifebox/events'),
        api('/lifebox/emergency'),
      ]);
      docs.value = d.data; reminders.value = r.data; events.value = e.data; emergency.value = em.data; loaded.value = true; loadedAt = Date.now();
    } catch (e) { error.value = e.message; } finally { loading.value = false; if (again) { again = false; load(true); } }
  }
  const refresh = () => load(true);
  // Screens are separate routes: load once, then only re-check if the data is older than 30 seconds.
  const ensureFresh = () => (!loaded.value || Date.now() - loadedAt > 30000 ? load(true) : undefined);
  const docById = (id) => docs.value.find((d) => d.id === id) ?? null;
  const takePending = () => { const f = pending.value; pending.value = null; return f; };
  return { docs, reminders, events, emergency, loaded, loading, error, pending, load, refresh, ensureFresh, docById, takePending };
});