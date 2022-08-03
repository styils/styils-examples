import '../styles/globals.css'
import type { AppProps } from 'next/app'
import {SystemProvider} from '../theme'

function MyApp({ Component, pageProps }: AppProps) {
  return <SystemProvider>
    <Component {...pageProps} />
  </SystemProvider>
}

export default MyApp
