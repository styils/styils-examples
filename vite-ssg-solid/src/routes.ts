import { RouteDefinition } from '@solidjs/router'
import Home from './pages'
import Counter from './pages/counter'
import About from './pages/about'

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Home
  },
  {
    path: '/counter',
    component: Counter
  },
  {
    path: '/about',
    component: About
  }
]
