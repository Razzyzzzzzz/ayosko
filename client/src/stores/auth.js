import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export const useAuth = defineStore('auth', () => {
  const session = ref(null);
  const profile = ref(null);
  let initPromise;

  const user = computed(() => session.value?.user ?? null);
  const confirmed = computed(() => !!user.value?.email_confirmed_at);

  function init() {
    return (initPromise ??= (async () => {
      const { data } = await supabase.auth.getSession();
      session.value = data.session;
      supabase.auth.onAuthStateChange((_e, s) => { session.value = s; if (!s) profile.value = null; });
    })());
  }
  async function loadProfile() { profile.value = (await api('/profile')).data; return profile.value; }
  async function signOut() { await supabase.auth.signOut(); profile.value = null; }

  return { session, profile, user, confirmed, init, loadProfile, signOut };
});
