export type ParsedBankFile = { ok: true; bank: unknown } | { ok: false; message: string }

/**
 * Reads the text of an uploaded file, in the browser so a broken file gets a clear message. It
 * forgives what commonly happens when a file is saved from a chat: a byte order mark, or the JSON
 * still wrapped in a code fence.
 */
export function parseBankFile(text: string): ParsedBankFile {
  const trimmed = text.replace(/^﻿/, '').trim()
  if (!trimmed) return { ok: false, message: 'This file is empty.' }

  const json = trimmed.match(/^```(?:json)?\s*\n([\s\S]*)\n```$/)?.[1] ?? trimmed
  try {
    return { ok: true, bank: JSON.parse(json) }
  } catch (error) {
    if (!json.endsWith('}')) {
      return { ok: false, message: "This file seems to be cut off: it doesn't end the way a question bank should. Ask for it to be generated again." }
    }
    return { ok: false, message: `This isn't valid JSON. ${(error as Error).message}` }
  }
}
