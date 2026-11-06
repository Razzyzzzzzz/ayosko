<script setup>
import { useToast } from '../stores/toast';
const toast = useToast();
const color = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-800' };
</script>
<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
    <TransitionGroup name="fade">
      <div v-for="t in toast.items" :key="t.id" role="status"
        :class="['pointer-events-auto rounded-lg px-4 py-3 text-sm text-white shadow-lg', color[t.type]]">{{ t.message }}</div>
    </TransitionGroup>
  </div>
</template>
