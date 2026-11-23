import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withTransaction } from './postgresClient.js'
import { createMessage } from './messagesRepository.js'

// A fake pool whose single client records every query and whether it was
// handed back to the pool.
function fakePool() {
  const client = {
    queries: [],
    released: false,
    async query(sql, params) {
      this.queries.push(params ? [sql, params] : sql)
      return { rows: [{ id: 1, sql }] }
    },
    release() {
      this.released = true
    },
  }
  return { client, pool: { connect: async () => client } }
}

test('withTransaction: commits and releases the client on success', async () => {
  const { client, pool } = fakePool()

  const result = await withTransaction(async (tx) => {
    await tx.query('INSERT 1')
    return 'done'
  }, pool)

  assert.equal(result, 'done')
  assert.deepEqual(client.queries, ['BEGIN', 'INSERT 1', 'COMMIT'])
  assert.equal(client.released, true)
})

test('withTransaction: rolls back and rethrows when fn fails', async () => {
  const { client, pool } = fakePool()
  const boom = new Error('second insert failed')

  await assert.rejects(
    withTransaction(async (tx) => {
      await tx.query('INSERT 1')
      throw boom
    }, pool),
    boom,
  )

  assert.deepEqual(client.queries, ['BEGIN', 'INSERT 1', 'ROLLBACK'])
  assert.equal(client.released, true)
})

test('withTransaction: still releases the client when ROLLBACK itself fails', async () => {
  const { client, pool } = fakePool()
  const realQuery = client.query.bind(client)
  client.query = async (sql) => {
    if (sql === 'ROLLBACK') throw new Error('connection lost')
    return realQuery(sql)
  }

  await assert.rejects(
    withTransaction(async () => {
      throw new Error('insert failed')
    }, pool),
  )

  assert.equal(client.released, true)
})

test('createMessage: one INSERT ... RETURNING * on the given client', async () => {
  const { client } = fakePool()

  await createMessage(3, 'user', 'hi', client)

  assert.equal(client.queries.length, 1)
  const [sql, params] = client.queries[0]
  assert.match(sql, /^INSERT INTO messages .* RETURNING \*$/)
  assert.deepEqual(params, [3, 'user', 'hi'])
})
