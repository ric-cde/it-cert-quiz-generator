import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { createApi } from './app'
import { openDb } from './db'

const CLIENT_DIR = './dist/client'

export function startServer({ port, serveClient }: { port: number; serveClient: boolean }) {
  if (existsSync('.env')) process.loadEnvFile('.env')

  const dataDir = process.env.DATA_DIR ?? './data'
  const db = openDb(resolve(dataDir, 'quiz.db'))

  const app = new Hono()
  app.route('/', createApi(db))
  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

  if (serveClient) {
    app.use('*', serveStatic({ root: CLIENT_DIR }))
    // Client-side routes: any other path gets the app, which handles it in the browser.
    app.get('*', serveStatic({ path: `${CLIENT_DIR}/index.html` }))
  }

  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}`)
  })
}
