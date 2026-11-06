<script setup>
import { X } from 'lucide-vue-next';
defineProps({ open: Boolean, title: String, wide: Boolean });
defineEmits(['close']);
</script>
<template>
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" @mousedown.self="$emit('close')">
      <div :class="['max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg']" role="dialog" aria-modal="true">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button class="rounded p-1 hover:bg-slate-100" aria-label="Close" @click="$emit('close')"><X class="h-5 w-5" /></button>
        </div>
        <slot />
      </div>
    </div>
  </Transition>
</template>
