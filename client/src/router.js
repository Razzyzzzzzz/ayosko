import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth';

const R = () => import('./views/ResourceView.vue');
const resource = (name) => ({ path: name, component: R, props: { resource: name } });

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('./views/Landing.vue'), meta: { guest: true } },
    { path: '/login', component: () => import('./views/auth/Login.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('./views/auth/Register.vue'), meta: { guest: true } },
    { path: '/forgot-password', component: () => import('./views/auth/Forgot.vue') },
    { path: '/reset-password', component: () => import('./views/auth/ResetPassword.vue') },
    { path: '/verify-email', component: () => import('./views/auth/VerifyEmail.vue') },
    { path: '/onboarding', component: () => import('./views/Onboarding.vue'), meta: { auth: true } },
    {
      path: '/app', component: () => import('./components/AppLayout.vue'), meta: { auth: true },
      children: [
        { path: '', redirect: '/app/dashboard' },
        { path: 'dashboard', component: () => import('./views/Dashboard.vue') },
        { path: 'inbox', component: () => import('./views/Inbox.vue') },
        { path: 'calendar', component: () => import('./views/CalendarView.vue') },
        resource('tasks'), resource('reminders'), resource('bills'), resource('appointments'), resource('documents'),
        // LifeBox: /app/lifebox, /app/lifebox/documents, /app/lifebox/view/:id, /app/lifebox/reminders/new, ...
        { path: 'lifebox/:section?/:id?', component: () => import('./components/LifeBox.vue') },
        { path: 'notifications', component: () => import('./views/Notifications.vue') },
        { path: 'profile', component: () => import('./views/Profile.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const a = useAuth();
  await a.init();

  // Verify page: kailangan ng email para malaman kung saan ipinadala ang code
  if (to.path === '/verify-email') {
    if (a.session && a.confirmed) return '/app/dashboard'; // verified na
    if (!to.query.email) {
      if (a.user?.email) return { path: to.path, query: { ...to.query, email: a.user.email } };
      return '/register'; // walang email at walang session, walang ma-verify
    }
    return;
  }

  if (to.meta.auth) {
    if (!a.session) return { path: '/login', query: { redirect: to.fullPath } };
    if (!a.confirmed) return { path: '/verify-email', query: { email: a.user.email } };
    if (!a.profile) {
      try { await a.loadProfile(); } catch { return { path: '/login', query: { error: 'server' } }; }
    }
    if (!a.profile.onboarded && to.path !== '/onboarding') return '/onboarding';
    if (a.profile.onboarded && to.path === '/onboarding') return '/app/dashboard';
  }
  if (to.meta.guest && a.session && a.confirmed) return '/app/dashboard';
});

export default router;