import { defineConfig, PluginOption } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { transformSync } from '@babel/core'
import path from 'node:path'

function parseId(id: string) {
  const index = id.indexOf('?')
  if (index < 0) return id
  return id.slice(0, index)
}

export default defineConfig({
  plugins: [
    {
      name: 'test',
      enforce: 'pre',
      async transform(code, id) {
        const filePath = parseId(id)

        if (
          !/node_modules/.test(filePath) &&
          /(j|t)sx?$/.test(filePath) &&
          process.env.NODE_ENV !== 'production'
        ) {
          const filename = filePath.replace(path.join(process.cwd(), 'src'), '')
          const fileResult = transformSync(code, {
            plugins: [
              [
                '@styils',
                {
                  importPaths: '@styils/solid'
                }
              ]
            ],
            filename
          })

          return fileResult || code
        }

        return code
      }
    } as PluginOption,
    solidPlugin({ ssr: true })
  ],
  server: { middlewareMode: true },
  ssr: {
    noExternal: ['@solidjs/router', '@styils/solid']
  },
  appType: 'custom'
})
