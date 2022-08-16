import { Component, createSignal } from 'solid-js'

function AA() {
  return <div>hello as</div>
}

const Home: Component = () => {
  const [height, setHeight] = createSignal(40)
  return (
    <>
      <h3>Home!</h3>
      <AA />
      <span>Click on links to navigate</span>
    </>
  )
}

export default Home
