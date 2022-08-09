import express from 'express'
import type { Application } from 'express'
import { createServer, ViteDevServer } from 'vite'
import { clientEntry, ssrEntry, clientRoot, isProduction } from './constants'
import { readFile } from 'fs/promises'

const createPageRenderer = async (app: Application) => {
  let vite: ViteDevServer
  let render: (url: string) => Promise<{ appHtml: string; extractHtml: string }>
  let hydrationScript: string
  let template: string
  let clientRoutes: string[]

  template = (await readFile(clientEntry)).toString()

  if (!isProduction) {
    vite = await createServer({ root: clientRoot })
    ;({ render, clientRoutes, hydrationScript } = await vite.ssrLoadModule(ssrEntry))

    app.use(vite.middlewares)
  } else {
    ;({ render, clientRoutes, hydrationScript } = await import(ssrEntry))

    app.use(express.static(clientRoot, { index: false }))
  }

  const transformEntry = async (url: string) => {
    const { appHtml, extractHtml } = await render(url)

    if (!isProduction) template = await vite.transformIndexHtml(url, template)

    return template
      .replace('<!--ssr-outlet-->', appHtml)
      .replace('<!--hydration-script-->', hydrationScript)
      .replace('<!--styils-->', extractHtml)
  }

  return {
    transformEntry,
    clientRoutes
  }
}

export default createPageRenderer
