import type { Component } from 'solid-js'
import { createSignal } from 'solid-js'

const Counter: Component = () => {
  const [count, setCount] = createSignal(0)
  const [shape, setShape] = createSignal<'o' | 'square'>('o')

  const increment = () => setCount(count() + 1)
  const decrement = () => setCount(count() - 1)

  return (
    <>
      <h3>Count!</h3>
      <button onClick={increment}>+</button>
      <div>{count()}</div>
      <button onClick={decrement}>-</button>
    </>
  )
}

export default Counter
