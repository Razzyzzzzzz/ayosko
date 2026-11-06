<script setup>
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';
defineProps({ title: String, subtitle: String });
</script>
<template>
  <div class="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-100 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
    <div class="w-full max-w-md">
      <RouterLink to="/" class="mb-4 flex justify-center" aria-label="AyosKo home">
        <img :src="logo" alt="AyosKo - Plan Better. Live Brighter." class="h-40 w-40 object-contain mix-blend-multiply sm:h-44 sm:w-44" />
      </RouterLink>
      <div class="card p-5 shadow-md sm:p-7">
        <h1 class="text-xl font-semibold">{{ title }}</h1>
        <p v-if="subtitle" class="mb-5 mt-1 text-sm text-slate-500">{{ subtitle }}</p>
        <slot />
      </div>
      <div class="mt-4 text-center text-sm text-slate-600"><slot name="footer" /></div>
    </div>
  </div>
</template>