// @refresh reload
import { Suspense } from 'solid-js'
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Meta,
  Routes,
  Scripts,
  Style
} from 'solid-start'
import { SystemProvider, createExtracts } from './theme'

import './root.css'

export default function Root() {
  const { extractElement, extractHtml } = createExtracts()

  return (
    <Html lang="en">
      <Head>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        {extractElement}
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <a href="/">Index</a>
            <a href="/about">About</a>
            <SystemProvider>
              <Routes>
                <FileRoutes />
              </Routes>
            </SystemProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
