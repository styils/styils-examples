import { Component, createSignal, onCleanup, onMount } from 'solid-js'
import { styled } from '@styils/solid'

const Button = styled('button', {
  color: 'red'
})

function AA() {
  return <div>hello as</div>
}

const About: Component = () => {
  const [count, setCount] = createSignal(0)
  let interval = null

  onMount(() => {
    interval = setInterval(() => setCount(count() + 1), 1000)
  })

  onCleanup(() => {
    clearInterval(interval)
  })

  return (
    <>
      <h3>About</h3>
      <Button>hello about</Button>
      <AA />
      <span>Time on page: {count()}sec</span>
    </>
  )
}

export default About
