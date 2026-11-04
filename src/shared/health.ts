import { z } from 'zod'
import { ROLES } from './domain'

/** Shape of GET /api/health. Lives in shared so the server and client agree on it. */
export const healthSchema = z.object({
  status: z.literal('ok'),
  users: z.array(z.object({ name: z.string(), role: z.enum(ROLES) })),
})

export type Health = z.infer<typeof healthSchema>
