import type { MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { createExtracts, SystemProvider } from './theme'


export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export default function App() {
  const { extractElement } = createExtracts()


  return (
    <html lang="en">
      <head>
        {extractElement}
        <Meta />
        <Links />
      </head>
      <body>
        <SystemProvider>
          <Outlet />
        </SystemProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
