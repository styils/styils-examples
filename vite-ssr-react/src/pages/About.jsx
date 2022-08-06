import { addAndMultiply } from '../add'
import { multiplyAndAdd } from '../multiply'
import { styled } from '@styils/react'

const Button = styled('button', {
  color: 'red'
})

export default function About() {
  return (
    <>
      <h1>About</h1>
      <Button>hello about</Button>
      <div>{addAndMultiply(1, 2, 3)}</div>
      <div>{multiplyAndAdd(1, 2, 3)}</div>
    </>
  )
}
