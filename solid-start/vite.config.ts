import solid from 'solid-start/vite'
import { defineConfig } from 'vite'
import styils from '@styils/vite-plugin'

export default defineConfig({
  plugins: [styils(), solid()],
  ssr: {
    noExternal: ['@styils/solid']
  }
})
