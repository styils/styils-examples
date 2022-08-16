<template>
  <system-provider>
    <router-link to="/">Home</router-link>|
    <router-link to="/about">About</router-link>
    <router-view v-slot="{ Component }">
      <Suspense>
        <div>
          <component :is="Component" />
        </div>
      </Suspense>
    </router-view>
  </system-provider>
</template>

<script>
import { SystemProvider, createGlobal } from '../theme'
import Inter from './assets/fonts/Inter-Italic.woff'
import Inter2 from './assets/fonts/Inter-Italic.woff2'

createGlobal({
  '@font-face': {
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: 400,
    fontDisplay: 'swap',
    src: `url(${Inter2}) format('woff2'),
    url(${Inter}) format('woff');`
  },
  '.inter': {
    fontFamily: 'Inter'
  },
  '#app': {
    fontFamily: `Avenir, Helvetica, Arial, sans-serif;`,
    '-webkit-font-smoothing': 'antialiased',
    '-moz-osx-font-smoothing': 'grayscale',
    textAlign: 'center',
    color: '#2c3e50',
    marginTop: '60px'
  }
})

export default {
  components: {
    SystemProvider
  }
}
</script>
