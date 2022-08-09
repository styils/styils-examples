import type { Component } from 'solid-js'
import { createSignal } from 'solid-js'
import { styled } from '@styils/solid'

const Button = styled(
  'button',
  {
    color: 'blue'
  },
  {
    shape: {
      o: {
        borderRadius: '50%'
      },
      square: {
        borderRadius: 0
      }
    }
  }
)

const Counter: Component = () => {
  const [count, setCount] = createSignal(0)
  const [shape, setShape] = createSignal<'o' | 'square'>('o')

  const increment = () => setCount(count() + 1)
  const decrement = () => setCount(count() - 1)

  return (
    <>
      <h3>Count!</h3>
      <Button
        variants={{
          shape: shape()
        }}
        onClick={() => {
          setShape(shape() === 'o' ? 'square' : 'o')
        }}
      >
        hello counter
      </Button>
      <button onClick={increment}>+</button>
      <div>{count()}</div>
      <button onClick={decrement}>-</button>
    </>
  )
}

export default Counter
