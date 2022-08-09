import { Title } from 'solid-start'
import Counter from '~/components/Counter'
import { styled, useSystem } from '../theme'

const Button = styled('button', (theme) => ({
  color: theme.color
}))

export default function Home() {
  const { setMode, mode } = useSystem()
  return (
    <main>
      <Title>Hello World</Title>
      <h1>Hello world!</h1>
      <Counter />
      <Button onClick={() => setMode(mode() === 'light' ? 'dark' : 'light')}>hello styils</Button>
      <p>
        Visit{' '}
        <a href="https://docs.solidjs.com/start" target="_blank">
          docs.solidjs.com/start
        </a>{' '}
        to learn how to build SolidStart apps.
      </p>
    </main>
  )
}
