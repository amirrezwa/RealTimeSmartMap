import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/MapPage.vue') }
    ],
  },

  {
    path: '/chat',
    component: () => import('pages/ChatPage.vue')
  },

  {
    path: '/group',
    component: () => import('pages/GroupPage.vue')
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;