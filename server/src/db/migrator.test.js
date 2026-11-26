import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { checksumOf, loadMigrations, migrate } from './migrator.js'

let db
let dir

// One database per file (PGlite takes seconds to start), wiped between tests.
before(async () => {
  db = new PGlite()
})

after(async () => {
  await db.close()
})

beforeEach(async () => {
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  dir = await mkdtemp(path.join(tmpdir(), 'migrations-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function writeMigration(name, sql) {
  await writeFile(path.join(dir, name), sql)
}

function load() {
  return loadMigrations(pathToFileURL(dir + path.sep))
}

async function tables() {
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  )
  return rows.map((row) => row.table_name)
}

test('applies pending migrations in order and records them', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT PRIMARY KEY);')
  await writeMigration('0002_create_b.sql', 'CREATE TABLE b (a_id INT REFERENCES a (id));')

  const result = await migrate(db, await load())

  assert.deepEqual(result.applied, ['0001_create_a.sql', '0002_create_b.sql'])
  assert.deepEqual(await tables(), ['a', 'b', 'schema_migrations'])
})

test('a second run is a no-op', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await migrate(db, await load())

  const second = await migrate(db, await load())

  assert.deepEqual(second.applied, [])
  const { rows } = await db.query('SELECT count(*)::int AS n FROM schema_migrations')
  assert.equal(rows[0].n, 1)
})

test('only runs the migrations added since the last run', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await migrate(db, await load())
  await writeMigration('0002_create_b.sql', 'CREATE TABLE b (id INT);')

  const result = await migrate(db, await load())

  assert.deepEqual(result.applied, ['0002_create_b.sql'])
})

test('refuses to run when an applied migration was edited', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await migrate(db, await load())
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id BIGINT);')
  await writeMigration('0002_create_b.sql', 'CREATE TABLE b (id INT);')

  await assert.rejects(migrate(db, await load()), /0001_create_a\.sql was edited/)
  assert.deepEqual(await tables(), ['a', 'schema_migrations'])
})

test('refuses to run when the database has a migration the repo does not', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await migrate(db, await load())
  await rm(path.join(dir, '0001_create_a.sql'))

  await assert.rejects(migrate(db, await load()), /0001_create_a\.sql is applied in the database but missing/)
})

test('a failing migration rolls back every migration in the run', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await writeMigration('0002_broken.sql', 'CREATE TABLE b (id INT); SELECT * FROM no_such_table;')

  await assert.rejects(migrate(db, await load()), /no_such_table/)

  // Not even 0001 or the schema_migrations table itself survived.
  assert.deepEqual(await tables(), [])
})

test('the checksum ignores Windows vs Linux line endings', () => {
  assert.equal(checksumOf('SELECT 1;\r\nSELECT 2;\r\n'), checksumOf('SELECT 1;\nSELECT 2;\n'))
  assert.notEqual(checksumOf('SELECT 1;'), checksumOf('SELECT 2;'))
})

test('orders migrations by name even when the folder listing is unordered', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT PRIMARY KEY);')
  await writeMigration('0002_create_b.sql', 'CREATE TABLE b (a_id INT REFERENCES a (id));')
  await writeMigration('0010_create_c.sql', 'CREATE TABLE c (id INT);')
  // Linux file systems may list files in any order; NTFS happens to sort them.
  const unordered = async () => ['0010_create_c.sql', '0002_create_b.sql', '0001_create_a.sql']

  const migrations = await loadMigrations(pathToFileURL(dir + path.sep), { listFiles: unordered })

  assert.deepEqual(
    migrations.map((m) => m.name),
    ['0001_create_a.sql', '0002_create_b.sql', '0010_create_c.sql'],
  )
  await migrate(db, migrations)
})

test('ignores files that are not migrations', async () => {
  await writeMigration('0001_create_a.sql', 'CREATE TABLE a (id INT);')
  await writeMigration('README.md', 'not sql')
  await writeMigration('notes.sql', 'DROP TABLE a;')

  assert.deepEqual((await load()).map((m) => m.name), ['0001_create_a.sql'])
})
