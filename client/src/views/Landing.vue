<script setup>
import { CheckSquare, Receipt, CalendarClock, FileText, Sparkles, ShieldCheck, CalendarCheck } from 'lucide-vue-next';
import logo from '../assets/2176bfe4-3818-4f5d-aeb8-6db3f41c0d10.png';
const features = [
  [CheckSquare, 'Tasks & reminders', 'Priorities, categories, due dates, and recurring tasks.'],
  [Receipt, 'Bills & payments', 'Never miss a due date. See what is overdue at a glance.'],
  [CalendarClock, 'Appointments', 'Dates, times, locations, and a built-in calendar.'],
  [FileText, 'Document tracker', 'Track expiry dates and attach private files.'],
  [Sparkles, 'Life Inbox', 'Type “Bayaran ang internet sa November 15” and confirm the details.'],
  [ShieldCheck, 'Private by design', 'Row Level Security keeps your records yours alone.'],
];
</script>
<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-100">
    <header class="mx-auto flex max-w-6xl items-center justify-between p-4">
      <span class="flex items-center gap-2 text-xl font-bold text-indigo-700"><CalendarCheck class="h-6 w-6" /> AyosKo</span>
      <div class="flex gap-2"><RouterLink to="/login" class="btn-ghost">Log in</RouterLink><RouterLink to="/register" class="btn-primary">Sign up</RouterLink></div>
    </header>
    <section class="mx-auto max-w-3xl px-4 py-12 text-center sm:py-16">
      <img :src="logo" alt="AyosKo - Plan Better. Live Brighter." class="mx-auto mb-6 h-48 w-48 object-contain mix-blend-multiply sm:h-56 sm:w-56" />
      <h1 class="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">Ayusin ang buhay mo, sa isang lugar.</h1>
      <p class="mx-auto mt-4 max-w-xl text-slate-600">AyosKo is your personal life organizer for tasks, bills, deadlines, appointments, and important documents.</p>
      <RouterLink to="/register" class="btn-primary mt-8 px-6 py-3 text-base">Get started free</RouterLink>
    </section>
    <section class="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="[icon, title, text] in features" :key="title" class="card transition hover:-translate-y-1 hover:shadow-md">
        <component :is="icon" class="mb-3 h-6 w-6 text-indigo-600" /><h3 class="font-semibold">{{ title }}</h3><p class="mt-1 text-sm text-slate-600">{{ text }}</p>
      </div>
    </section>
  </div>
</template>