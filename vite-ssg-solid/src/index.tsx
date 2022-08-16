import { Router } from '@solidjs/router'
import { hydrate, render } from 'solid-js/web'
import App from './App'
;(process.env.NODE_ENV === 'production' ? hydrate : render)(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById('root')
)
