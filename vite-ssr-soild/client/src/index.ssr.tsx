import { Router } from '@solidjs/router'
import { generateHydrationScript, renderToString } from 'solid-js/web'
import App from './App'
import { routes } from './routes'
import { createExtracts } from '@styils/solid'

export function render(url: string) {
  const appHtml = renderToString(() => (
    <Router url={url}>
      <App />
    </Router>
  ))
  const { extractHtml } = createExtracts()

  return { appHtml, extractHtml: extractHtml }
}

export const hydrationScript = generateHydrationScript()

export const clientRoutes = routes.map(({ path }) => path)
