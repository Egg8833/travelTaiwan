import {createRouter, createWebHistory} from 'vue-router'

import Home from '../views/HomeView.vue'
import viewList from '../views/viewList.vue'
import viewPoint from '../page/viewPoint.vue'

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
      path: '/:pathMatch(.*)*',
      redirect: {name: 'home'},
    },
  ],
  scrollBehavior() {
    // always scroll to top
    return {top: 0}
  },
})

export default router
