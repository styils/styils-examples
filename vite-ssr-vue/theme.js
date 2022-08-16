import { createSystem } from '@styils/vue'

export const { styled, SystemProvider, createExtracts, useSystem, createGlobal } = createSystem({
  theme(mode) {
    return {
      dark: {
        color: 'red'
      },
      light: {
        color: 'red'
      }
    }[mode]
  },
  defaultMode: 'light'
})
