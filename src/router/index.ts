import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TestFirebase from '@/views/TestFirebase.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/example',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
    {
      path: '/',
      name: 'playground',
      component: () => import('@/views/PlaygroundView.vue'),
    },
    {
      path: '/test',
      name: 'test-firebase',
      component: TestFirebase,
    },
    {
      path: '/proyecto/:id',
      name: 'ProjectDetail',
      component: () => import('@/views/ProjectDetail.vue'),
    }
  ],
})

export default router
