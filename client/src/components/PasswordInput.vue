<script setup>
import { ref } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
defineProps({
  modelValue: String,
  id: String,
  autocomplete: { type: String, default: 'current-password' },
  placeholder: String,
  invalid: Boolean,
  describedby: String,
});
defineEmits(['update:modelValue']);
const show = ref(false);
</script>
<template>
  <div class="relative">
    <input :id="id" :type="show ? 'text' : 'password'" :value="modelValue" :autocomplete="autocomplete" :placeholder="placeholder"
      :aria-invalid="invalid || undefined" :aria-describedby="describedby"
      :class="['input pr-12', invalid && 'border-red-400 focus:border-red-500 focus:ring-red-200']"
      autocapitalize="none" spellcheck="false" @input="$emit('update:modelValue', $event.target.value)" />
    <button type="button" class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:text-slate-700"
      :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show" @click="show = !show">
      <EyeOff v-if="show" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
    </button>
  </div>
</template>