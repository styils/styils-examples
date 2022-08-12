import { Component, createSignal } from 'solid-js'
import { styled } from '@styils/solid'

const Button = styled('button', {
  color: '#999',
  height: '$height'
})

function AA() {
  return <div>hello as</div>
}

const Home: Component = () => {
  const [height, setHeight] = createSignal(40)
  return (
    <>
      <h3>Home!</h3>
      <AA />
      <Button vars={{ height: `${height()}px` }} onClick={() => setHeight(height() + 10)}>
        hello home
      </Button>
      <span>Click on links to navigate</span>
    </>
  )
}

export default Home
