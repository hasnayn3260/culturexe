import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Buffer } from 'node:buffer'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function appVersionPlugin(version) {
  return {
    name: 'culturexe-app-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      })
    },
  }
}

function localApiPlugin() {
  const routes = new Map([
    ['/api/organisations', '/api/organisations/index.ts'],
    ['/api/users', '/api/users/index.ts'],
    ['/api/users/import', '/api/users/import.ts'],
    ['/api/surveys', '/api/surveys/index.ts'],
    ['/api/surveys/files', '/api/surveys/files.ts'],
    ['/api/surveys/invitations', '/api/surveys/invitations.ts'],
    ['/api/surveys/reminders', '/api/surveys/reminders.ts'],
    ['/api/surveys/receipt', '/api/surveys/receipt.ts'],
  ])

  return {
    name: 'culturexe-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(
          request.url || '/',
          `http://${request.headers.host || 'localhost'}`,
        )

        const modulePath = routes.get(requestUrl.pathname)
        if (!modulePath) {
          next()
          return
        }

        try {
          const chunks = []
          for await (const chunk of request) chunks.push(chunk)
          const body = Buffer.concat(chunks)
          const headers = new Headers()

          for (const [name, value] of Object.entries(request.headers)) {
            if (Array.isArray(value)) {
              value.forEach((item) => headers.append(name, item))
            } else if (value !== undefined) {
              headers.set(name, value)
            }
          }

          const webRequest = new Request(requestUrl, {
            method: request.method,
            headers,
            body: request.method === 'GET' || request.method === 'HEAD'
              ? undefined
              : body,
          })
          const apiModule = await server.ssrLoadModule(modulePath)
          const apiResponse = await apiModule.default.fetch(webRequest)

          response.statusCode = apiResponse.status
          apiResponse.headers.forEach((value, name) => {
            response.setHeader(name, value)
          })
          response.end(Buffer.from(await apiResponse.arrayBuffer()))
        } catch (error) {
          server.ssrFixStacktrace(error)
          console.error(`Local ${requestUrl.pathname} error:`, error)
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({
            error: error instanceof Error
              ? error.message
              : 'Local API request failed.',
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, rootDir, '')
  const buildVersion = new Date().toISOString()

  for (const [name, value] of Object.entries(localEnv)) {
    if (process.env[name] === undefined) process.env[name] = value
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiPlugin(),
      appVersionPlugin(buildVersion),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
  }
})
