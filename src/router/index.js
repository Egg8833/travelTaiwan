import {createRouter, createWebHistory} from 'vue-router'

import Home from '../views/HomeView.vue'
import viewList from '../views/viewList.vue'
import viewPoint from '../page/viewPoint.vue'
import LoginView from '../views/LoginView.vue'
import MyJourneyView from '../views/MyJourneyView.vue'
import {useAuthStore} from '@/store/authStore.js'

const path = process.env.NODE_ENV === 'production' ? '/travelTaiwan/' : ''

const router = createRouter({
  history: createWebHistory(path),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/viewList',
      name: 'viewList',
      component: viewList,
    },
    {
      path: '/viewList/:id',
      name: 'viewPoint',
      component: viewPoint,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/my-journey',
      name: 'myJourney',
      component: MyJourneyView,
      meta: {requiresAuth: true},
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: {name: 'home'},
    },
  ],
  scrollBehavior() {
    // always scroll to top
    return {top: 0}
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const authStore = useAuthStore()
  if (!authStore.isAuthReady) {
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe(() => {
        if (authStore.isAuthReady) {
          unwatch()
          resolve()
        }
      })
    })
  }
  if (!authStore.user) {
    return {name: 'login', query: {redirect: to.fullPath}}
  }
  return true
})

export default router
