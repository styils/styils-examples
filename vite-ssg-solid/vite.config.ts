import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import styils from '@styils/vite-plugin'

export default defineConfig({
  plugins: [styils(), solidPlugin({ ssr: process.env.NODE_ENV === 'production' })],
  ssr: {
    noExternal: ['@solidjs/router', '@styils/solid']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})
