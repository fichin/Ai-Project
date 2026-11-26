import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { loadMigrations, migrate } from './migrator.js'
import { daysAgo, setPostgresPoolForTests } from './postgresClient.js'
import { createUser, markEmailVerified, updateUserPassword, getUserById } from './usersRepository.js'
import { createSession, getSessionUser } from './sessionsRepository.js'
import { createVerificationToken, consumeVerificationToken } from './emailVerificationRepository.js'
import { createResetToken, consumeResetToken } from './passwordResetRepository.js'
import { createConversation, touchConversation, setConversationTitle } from './conversationsRepository.js'
import { createMessage, countAssistantMessagesSince, countAssistantMessagesByUserSince } from './messagesRepository.js'
import {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCountForUser,
  listNotificationsForUser,
} from './notificationsRepository.js'
import { updatePreferencesForUser } from './preferencesRepository.js'
import { createProject, updateProject } from './projectsRepository.js'
import { createAgent, updateAgent } from './agentsRepository.js'
import { getStatsForUser, getUsageSeries, getRecentActivity } from './dashboardRepository.js'

// Smoke tests: every query that PR 5 changed runs once against real Postgres
// (PGlite) with the migrated schema. Mocks can't catch a wrong column type.
let db
let userId

before(async () => {
  db = new PGlite()
  const query = (text, params) => db.query(text, params)
  setPostgresPoolForTests({ query, connect: async () => ({ query, release() {} }) })
})

after(async () => {
  setPostgresPoolForTests(null)
  await db.close()
})

beforeEach(async () => {
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await migrate(db, await loadMigrations())
  userId = (await createUser({ email: 'ada@example.com', name: 'Ada', passwordHash: 'x' })).id
})

async function expire(table) {
  await db.query(`UPDATE ${table} SET expires_at = now() - interval '1 minute'`)
}

test('sessions are valid until expires_at, then rejected', async () => {
  await markEmailVerified(userId)
  const token = await createSession(userId)

  const user = await getSessionUser(token)
  assert.equal(user.id, userId)
  assert.ok(user.email_verified_at instanceof Date)

  await expire('sessions')
  assert.equal(await getSessionUser(token), null)
})

test('email verification and reset tokens honour their expiry', async () => {
  const verify = await createVerificationToken(userId)
  assert.equal(await consumeVerificationToken(verify), userId)

  const reset = await createResetToken(userId)
  await expire('password_reset_tokens')
  assert.equal(await consumeResetToken(reset), null)
})

test('updates stamp updated_at with now()', async () => {
  await db.query(`UPDATE users SET updated_at = now() - interval '1 day'`)
  await updateUserPassword(userId, 'y')
  const user = await getUserById(userId)
  assert.ok(Date.now() - user.updated_at.getTime() < 60_000)

  const project = await createProject(userId, { name: 'P', description: null, status: 'active' })
  assert.ok((await updateProject(project.id, userId, { name: 'P2' })).updated_at instanceof Date)

  const agent = await createAgent(userId, { name: 'G', description: null, status: 'draft', projectId: null })
  assert.ok((await updateAgent(agent.id, userId, { name: 'G2' })).updated_at instanceof Date)

  const conversation = await createConversation(userId, 'Chat')
  await touchConversation(conversation.id)
  await setConversationTitle(conversation.id, 'Renamed')

  await updatePreferencesForUser(userId, { theme: 'dark' })
  const { rows } = await db.query('SELECT updated_at FROM user_preferences WHERE user_id = $1', [userId])
  assert.ok(rows[0].updated_at instanceof Date)
})

test('notifications get a real read_at', async () => {
  await createNotification(userId, { type: 'project_created' })
  await createNotification(userId, { type: 'project_created' })
  assert.equal(await getUnreadCountForUser(userId), 2)
  const [first] = await listNotificationsForUser(userId)

  const read = await markNotificationRead(first.id, userId)
  assert.ok(read.read_at instanceof Date)
  await markAllNotificationsRead(userId)
  assert.equal(await getUnreadCountForUser(userId), 0)
})

test('AI quota counts use a Date boundary', async () => {
  const conversation = await createConversation(userId, 'Chat')
  await createMessage(conversation.id, 'assistant', 'recent')
  const old = await createMessage(conversation.id, 'assistant', 'old')
  await db.query(`UPDATE messages SET created_at = now() - interval '2 days' WHERE id = $1`, [old.id])

  assert.equal(await countAssistantMessagesSince(daysAgo(1)), 1)
  assert.equal(await countAssistantMessagesByUserSince(userId, daysAgo(1)), 1)
})

test('dashboard trends, day buckets and activity feed', async () => {
  const conversation = await createConversation(userId, 'Chat')
  await createMessage(conversation.id, 'user', 'today')
  const earlier = await createMessage(conversation.id, 'user', 'ten days ago')
  await db.query(`UPDATE messages SET created_at = now() - interval '10 days' WHERE id = $1`, [earlier.id])

  const stats = await getStatsForUser(userId)
  assert.equal(stats.messages.total, 2)
  assert.equal(stats.messages.last7Days, 1)

  const series = await getUsageSeries(userId, 14)
  const today = new Date().toISOString().slice(0, 10)
  assert.equal(series.at(-1).date, today)
  assert.equal(series.at(-1).count, 1)
  assert.equal(series.reduce((sum, day) => sum + day.count, 0), 2)

  const feed = await getRecentActivity(userId)
  assert.ok(feed[0].timestamp instanceof Date)
})
