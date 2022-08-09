import { dirname, resolve } from 'path'

export const isProduction = process.env.NODE_ENV === 'production'

export const __dirname = dirname(new URL(import.meta.url).pathname)

export const clientRoot = resolve(__dirname, '../client')

export const ssrEntry = isProduction
  ? resolve(__dirname, '../ssr/index.ssr.js')
  : resolve(clientRoot, 'src/index.ssr.tsx')

export const clientEntry = resolve(clientRoot, 'index.html')
