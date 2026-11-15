import { HttpError } from '@/lib/http'

export function failureMessage(error: Error) {
  if (error instanceof HttpError && error.status === 403) return "You don't have permission to do this."
  return `Something went wrong: ${error.message}`
}
