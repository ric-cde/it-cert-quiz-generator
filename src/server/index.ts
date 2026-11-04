import { DEFAULT_PORT } from '../shared/ports'
import { startServer } from './start'

// Production entry (`npm start`): serves the API and the built frontend on one port.
startServer({ port: Number(process.env.PORT ?? DEFAULT_PORT), serveClient: true, defaultDataDir: './data' })
