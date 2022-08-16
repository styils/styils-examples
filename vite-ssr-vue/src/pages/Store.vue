<template>
  <H1>{{ foo }}</H1>
</template>

<script>
import { createStore } from 'vuex'
import { styled } from '../../theme'

const H1 = styled('h1', {
  color: 'red'
})

export default {
  components: { H1 },
  async setup() {
    const store = createStore({
      state: {
        foo: 'bar'
      }
    })
    return store.state
  }
}
</script>
