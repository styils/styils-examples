import { Router } from '@solidjs/router'
import { renderToStringAsync } from 'solid-js/web'
import App from './App'
import { routes } from './routes'
import { createExtracts, flush } from '@styils/solid'

export async function render(url: string) {
  const appHtml = await renderToStringAsync(() => (
    <Router url={url}>
      <App />
    </Router>
  ))

  const { extractHtml } = createExtracts()
  // flush('global')

  return { appHtml, extractHtml: extractHtml }
}

export const clientRoutes = routes.map(({ path }) => path)
