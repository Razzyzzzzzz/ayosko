<script setup>
import { reactive, ref, watch, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import { api } from '../lib/api';
import { useCategories } from '../stores/categories';
import { useToast } from '../stores/toast';
import { todayStr, cap } from '../lib/format';

const props = defineProps({ open: Boolean, tx: Object, type: { type: String, default: 'expense' } });
const emit = defineEmits(['close', 'saved']);
const cats = useCategories(); const toast = useToast();
const f = reactive({ type: 'expense', amount: '', category: '', spent_on: todayStr(), description: '', payment_method: 'cash' });
const saving = ref(false); const errors = ref([]);
const options = computed(() => cats.names(f.type));
const METHODS = ['cash', 'gcash', 'maya', 'card', 'bank'];

const fixCategory = () => { if (!options.value.includes(f.category)) f.category = options.value[0] ?? ''; };
watch(() => props.open, async (o) => {
  if (!o) return;
  errors.value = [];
  try { await cats.load(); } catch (e) { toast.error(e.message); }
  const t = props.tx;
  Object.assign(f, t
    ? { type: t.type, amount: t.amount, category: t.category, spent_on: t.spent_on, description: t.description ?? '', payment_method: t.payment_method }
    : { type: props.type, amount: '', category: '', spent_on: todayStr(), description: '', payment_method: 'cash' });
  fixCategory();
});
watch(() => f.type, fixCategory);

async function save() {
  errors.value = [];
  const amount = Number(f.amount);
  if (!(amount > 0)) return (errors.value = [{ message: 'Enter an amount greater than zero.' }]);
  if (!f.category) return (errors.value = [{ message: 'Choose a category.' }]);
  if (!f.spent_on) return (errors.value = [{ message: 'Choose a date.' }]);
  saving.value = true;
  try {
    const body = { type: f.type, amount, category: f.category, spent_on: f.spent_on, description: f.description.trim() || null, payment_method: f.payment_method };
    await api(props.tx ? `/transactions/${props.tx.id}` : '/transactions', { method: props.tx ? 'PATCH' : 'POST', body });
    toast.success(props.tx ? 'Saved.' : f.type === 'income' ? 'Income added.' : 'Expense added.');
    emit('saved'); emit('close');
  } catch (e) { errors.value = e.details?.length ? e.details : [{ message: e.message }]; } finally { saving.value = false; }
}
</script>

<template>
  <BaseModal :open="open" :title="tx ? 'Edit transaction' : f.type === 'income' ? 'Add income' : 'Add expense'" @close="emit('close')">
    <form class="space-y-4" novalidate @submit.prevent="save">
      <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Type">
        <button v-for="t in ['expense', 'income']" :key="t" type="button" :aria-pressed="f.type === t"
          :class="['min-h-[44px] rounded-lg text-sm font-semibold transition', f.type === t ? (t === 'income' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-indigo-700 shadow') : 'text-slate-600']" @click="f.type = t">{{ cap(t) }}</button>
      </div>
      <div><label class="label" for="tx-amount">Amount (₱)</label><input id="tx-amount" v-model="f.amount" type="number" min="0" step="0.01" inputmode="decimal" class="input" placeholder="0.00" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="tx-cat">Category</label><select id="tx-cat" v-model="f.category" class="input"><option v-for="c in options" :key="c" :value="c">{{ cap(c) }}</option></select></div>
        <div><label class="label" for="tx-date">Date</label><input id="tx-date" v-model="f.spent_on" type="date" class="input" /></div>
      </div>
      <div><label class="label" for="tx-desc">Description</label><input id="tx-desc" v-model="f.description" class="input" maxlength="200" :placeholder="f.type === 'income' ? 'e.g. October salary' : 'e.g. Lunch at the canteen'" /></div>
      <div><label class="label" for="tx-pm">{{ f.type === 'income' ? 'Received via' : 'Paid with' }}</label><select id="tx-pm" v-model="f.payment_method" class="input"><option v-for="m in METHODS" :key="m" :value="m">{{ cap(m) }}</option></select></div>
      <ul v-if="errors.length" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert"><li v-for="(e, i) in errors" :key="i">{{ e.field ? cap(e.field) + ': ' : '' }}{{ e.message }}</li></ul>
      <div class="flex justify-end gap-2"><button type="button" class="btn-ghost" @click="emit('close')">Cancel</button><button class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button></div>
    </form>
  </BaseModal>
</template>
