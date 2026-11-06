<script setup>
import { ArrowLeft } from 'lucide-vue-next';
defineProps({ title: String, subtitle: String, to: { type: String, default: '/app/lifebox' } });
</script>
<template>
  <header class="mb-4 flex items-center gap-2">
    <RouterLink :to="to" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Back"><ArrowLeft class="h-5 w-5" /></RouterLink>
    <div class="min-w-0 flex-1"><h1 class="truncate text-lg font-bold">{{ title }}</h1><p v-if="subtitle" class="truncate text-xs text-slate-500">{{ subtitle }}</p></div>
    <slot />
  </header>
</template>
