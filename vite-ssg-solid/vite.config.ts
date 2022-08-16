import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin({ ssr: process.env.NODE_ENV === 'production' })],
  ssr: {
    noExternal: ['@solidjs/router']
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  build: {
    minify: false
  }
})
