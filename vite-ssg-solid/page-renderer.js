import { readFile } from 'fs/promises'
import { format } from 'prettier'
import fs from 'fs-extra'
import path from 'path'
import { dirname, resolve } from 'path'

export const isProduction = process.env.NODE_ENV === 'production'

export const __dirname = dirname(new URL(import.meta.url).pathname)

export const clientRoot = resolve(__dirname)

export const ssrEntry = isProduction
  ? resolve(__dirname, 'dist/ssr/index.ssr.js')
  : resolve(clientRoot, 'dist/index.ssr.tsx')

export const clientEntry = resolve(clientRoot, 'dist/index.html')

const createPageRenderer = async () => {
  const template = (await readFile(clientEntry)).toString()

  const { render, clientRoutes } = await import(ssrEntry)

  const transformEntry = async (url) => {
    const { appHtml, extractHtml } = await render(url)

    return template.replace('<!--ssr-outlet-->', appHtml).replace('<!--styils-->', extractHtml)
  }

  for (const url of clientRoutes) {
    const html = await transformEntry(url)

    const filePath = `dist${url === '/' ? '/index' : url}.html`
    const toAbsolute = (p) => path.resolve(__dirname, p)

    fs.outputFileSync(toAbsolute(filePath), format(html, { parser: 'html' }))
    console.log('pre-rendered:', filePath)
  }
}

createPageRenderer()
