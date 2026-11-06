import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../lib/api';

// Default + custom categories, grouped by type. Loaded once, refreshed after edits.
export const useCategories = defineStore('categories', () => {
  const data = ref({ expense: [], income: [] });
  const loaded = ref(false);
  async function load(force = false) {
    if (loaded.value && !force) return;
    data.value = (await api('/categories')).data;
    loaded.value = true;
  }
  const color = (name) => [...data.value.expense, ...data.value.income].find((c) => c.name === name)?.color ?? '#94a3b8';
  const names = (type) => data.value[type].map((c) => c.name);
  return { data, load, color, names };
});
