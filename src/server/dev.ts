import { DEV_API_PORT } from '../shared/ports'
import { startServer } from './start'

// Development entry (`npm run dev`): API only, because Vite serves the frontend.
// It has its own database, so test data can't mix with real study progress.
startServer({ port: DEV_API_PORT, serveClient: false, defaultDataDir: './data/dev' })
