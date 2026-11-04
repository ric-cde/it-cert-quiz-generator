import { writeFileSync } from 'node:fs'
import { questionBankJsonSchema } from '../src/shared/question-bank'

// Run with `npm run bank:schema` after changing src/shared/question-bank.ts.
writeFileSync('docs/question-bank.schema.json', `${JSON.stringify(questionBankJsonSchema(), null, 2)}\n`)
