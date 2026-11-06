<script setup>
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';

// Pareho ng gamit ng Login, Register, Forgot, ResetPassword at VerifyEmail:
// props: title, subtitle (optional) | slots: default (form), footer (optional)
defineProps({ title: { type: String, default: '' }, subtitle: { type: String, default: '' } });
</script>

<template>
  <div class="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 sm:py-10">
    <!-- Dekorasyon sa likod (hindi nakakaapekto sa layout) -->
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl sm:h-96 sm:w-96"></div>
      <div class="absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl sm:h-96 sm:w-96"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.indigo.200/0.45)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"></div>
    </div>

    <main class="w-full max-w-md pb-[4vh] sm:pb-0">
      <div class="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-xl shadow-indigo-900/10 ring-1 ring-slate-900/5 backdrop-blur min-[380px]:p-6 sm:p-8">
        <div class="text-center">
          <RouterLink to="/" class="inline-block rounded-xl" aria-label="AyosKo home">
            <img :src="logo" alt="AyosKo" class="mx-auto h-14 w-14 object-contain mix-blend-multiply sm:h-16 sm:w-16" />
          </RouterLink>
          <h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-900">{{ title }}</h1>
          <p v-if="subtitle" class="mt-1 text-sm text-slate-600">{{ subtitle }}</p>
        </div>

        <div class="mt-6">
          <slot />
        </div>

        <div v-if="$slots.footer" class="mt-5 border-t border-slate-200 pt-3 text-center text-sm text-slate-600">
          <slot name="footer" />
        </div>
      </div>
    </main>
  </div>
</template>