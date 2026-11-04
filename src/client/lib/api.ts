import { hc } from 'hono/client'
import type { AppType } from '../../server/app'

/** The only way the frontend talks to the server. Mismatches with server routes are compile errors. */
export const api = hc<AppType>('/')
