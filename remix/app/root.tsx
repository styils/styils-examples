import type { MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import {getCssValue,SystemProvider} from './theme'


export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export default function App() {
  const {StyilRules} = getCssValue()


  return (
    <html lang="en">
      <head>
        {StyilRules}
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
