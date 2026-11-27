import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLocalHost, sslFor } from './postgresClient.js'

const TLS = { rejectUnauthorized: false }

test('local databases connect without TLS', () => {
  assert.equal(sslFor('postgres://postgres:postgres@localhost:5432/postgres'), false)
  assert.equal(sslFor('postgres://postgres@127.0.0.1:5433/postgres'), false)
  assert.equal(sslFor('postgres://postgres@[::1]:5432/postgres'), false)
})

test('remote databases keep TLS', () => {
  assert.deepEqual(sslFor('postgresql://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'), TLS)
  assert.deepEqual(sslFor('postgresql://postgres:pw@db.abc.supabase.co:5432/postgres'), TLS)
})

test('a look-alike host is not treated as local', () => {
  assert.deepEqual(sslFor('postgres://u:p@localhost.attacker.example:5432/db'), TLS)
  assert.equal(isLocalHost('notlocalhost'), false)
})

test('an unparseable URL keeps TLS rather than turning it off', () => {
  assert.deepEqual(sslFor('not a url'), TLS)
  assert.deepEqual(sslFor(''), TLS)
})

test('IPv6 hostnames keep their brackets in URL, so the set lists [::1]', () => {
  assert.equal(new URL('postgres://h@[::1]:5432/db').hostname, '[::1]')
  assert.equal(isLocalHost('[::1]'), true)
})
