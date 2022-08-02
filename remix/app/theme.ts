import { createSystem, } from '@styils/react'

export const { styled, SystemProvider, getCssValue, useSystem } = createSystem({
  theme(mode) {
    return {
      color: mode === 'light' ? 'red' : 'blue'
    }
  },
  defaultMode:"light"
})
