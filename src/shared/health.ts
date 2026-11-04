import { z } from 'zod'

/** Shape of GET /api/health. Lives in shared so the server and client agree on it. */
export const healthSchema = z.object({
  status: z.literal('ok'),
  users: z.array(z.object({ name: z.string(), role: z.enum(['admin', 'editor', 'learner']) })),
})

export type Health = z.infer<typeof healthSchema>
