import { useRoutes, Link } from '@solidjs/router'
import type { Component } from 'solid-js'
import { routes } from './routes'

const App: Component = () => {
  const Routes = useRoutes(routes)

  return (
    <>
      <h2>Hi from SolidJS + @styils/solid + Vite + SSR!</h2>
      <nav style={{ display: 'flex', 'column-gap': '15px' }}>
        <Link href="/">Home</Link>
        <Link href="/counter">Counter</Link>
        <Link href="/about">About</Link>
      </nav>
      <Routes />
    </>
  )
}

export default App
