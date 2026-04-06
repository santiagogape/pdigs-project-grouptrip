import { createRouter, createWebHistory } from 'vue-router'
import TestFirebase from '@/views/TestFirebase.vue'
import { auth } from '@/services/remote/firebase/config';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
    {
      path: '/new-project',
      name: 'new-project',
      meta: { requiresAuth: true },
      component: () => import('@/views/CreateProjectView.vue'),
    },
    {
      path: '/test',
      name: 'test-firebase',
      component: TestFirebase,
    },
    {
      path: '/proyecto/:id',
      name: 'ProjectDetail',
      meta: { requiresAuth: true },
      component: () => import('@/views/ProjectDetail.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      meta: { requiresAuth: true },
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/share/:id',
      name: 'Share',
      meta: { requiresAuth: true },
      component: () => import('@/views/SharePage.vue'),
    }
  ],
})

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const currentUser = auth.currentUser;

  // Si requiere auth y no hay usuario -> Mandar al Login
  if (requiresAuth && !currentUser) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath }
    }; // O la ruta de tu login
  }

  // Si el usuario ya está logueado e intenta ir al Login o Register -> Mandar al Dashboard
  if ((to.name === 'Login' || to.name === 'Register') && currentUser) {
    return { name: 'Dashboard' };
  }

  // En cualquier otro caso, el router sigue su camino normal (no retornar nada o retornar true)
});

export default router
