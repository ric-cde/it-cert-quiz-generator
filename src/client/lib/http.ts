/** A response the server rejected. The status lets callers tell "not allowed" from "server down". */
export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Server responded with ${status}`)
  }
}

type AnyResponse = { ok: boolean; status: number; json(): Promise<unknown> }
// Removes only the known failures, because a route with no explicit status has `ok: boolean`.
type SuccessBody<R extends AnyResponse> = Awaited<ReturnType<Exclude<R, { ok: false }>['json']>>

/** Unwraps an `hc` response, so a failed request becomes a failed query, typed as the success body. */
export async function readJson<R extends AnyResponse>(res: R): Promise<SuccessBody<R>> {
  if (!res.ok) throw new HttpError(res.status)
  return res.json() as Promise<SuccessBody<R>>
}

const MAX_RETRIES = 8

/**
 * Keeps trying for a while, so opening the app just before the server is ready isn't an error.
 * A 4xx won't change by asking again, so it shows straight away.
 */
export function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof HttpError && error.status < 500) return false
  return failureCount < MAX_RETRIES
}
