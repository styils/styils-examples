import { Router } from '@solidjs/router'
import { renderToStringAsync, generateHydrationScript } from 'solid-js/web'
import App from './src/App'
import { routes } from './src/routes'

export async function render(url) {
  const appHtml = await renderToStringAsync(() => (
    <Router url={url}>
      <App />
    </Router>
  ))

  return { appHtml, extractHtml: '' }
}

export const hydrationScript = generateHydrationScript()

export const clientRoutes = routes.map(({ path }) => path)
