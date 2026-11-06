<script setup>
import BaseModal from './BaseModal.vue';
defineProps({ open: Boolean, message: String, confirmLabel: { type: String, default: 'Delete' }, busy: Boolean });
defineEmits(['confirm', 'cancel']);
</script>
<template>
  <BaseModal :open="open" title="Are you sure?" @close="$emit('cancel')">
    <p class="mb-5 text-sm text-slate-600">{{ message }}</p>
    <div class="flex justify-end gap-2">
      <button class="btn-ghost" @click="$emit('cancel')">Cancel</button>
      <button class="btn-danger" :disabled="busy" @click="$emit('confirm')">{{ confirmLabel }}</button>
    </div>
  </BaseModal>
</template>
