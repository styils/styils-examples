import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import styils from '@styils/vite-plugin'

export default defineConfig({
  plugins: [styils(), solidPlugin({ ssr: true })],
  server: { middlewareMode: true },
  ssr: {
    noExternal: ['@solidjs/router', '@styils/solid']
  },
  appType: 'custom'
})
