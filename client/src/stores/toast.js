import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToast = defineStore('toast', () => {
  const items = ref([]);
  let id = 0;
  const push = (message, type = 'info', ms = 4000) => {
    const t = { id: ++id, message, type };
    items.value.push(t);
    setTimeout(() => (items.value = items.value.filter((x) => x.id !== t.id)), ms);
  };
  return { items, push, success: (m) => push(m, 'success'), error: (m) => push(m, 'error', 6000) };
});
