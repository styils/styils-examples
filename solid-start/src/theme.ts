import { createSystem, } from '@styils/solid'

export const { styled, SystemProvider, createExtracts, useSystem } = createSystem({
  theme(mode) {
    return {
      color: mode === 'light' ? 'red' : 'blue'
    }
  },
  defaultMode:"light"
})
