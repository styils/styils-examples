import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { createExtracts /** flush */ } from '@styils/react'
import { App } from './App'

export function render(url, context) {
  const { extractHtml } = createExtracts()
  // flush('global') Pre-rendering can choose to reset styles other than global for each page, refer to
  // https://github.com/styils/styils/blob/main/docs/entryServer.jsx
  const appHtml = ReactDOMServer.renderToString(
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>
  )
  return { appHtml, extractHtml }
}
