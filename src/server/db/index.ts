import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

const MIGRATIONS_FOLDER = resolve(process.cwd(), 'drizzle')

/** Opens the database and brings it up to date. Pass ':memory:' in tests. */
export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })

  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  seed(db)
  return db
}

/** Safe to run on every start: only adds what's missing. */
function seed(db: Db) {
  if (!db.select().from(schema.users).limit(1).get()) {
    db.insert(schema.users).values({ name: 'Admin', role: 'admin' }).run()
  }
}
