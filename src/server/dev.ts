import { DEV_API_PORT } from '../shared/ports'
import { startServer } from './start'

// Development entry (`npm run dev`): API only, because Vite serves the frontend.
startServer({ port: DEV_API_PORT, serveClient: false })
