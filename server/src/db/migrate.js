import { env } from '../config/env.js'
import { getDb, listTableNames } from './index.js'

getDb()
const tables = listTableNames()

console.log(`Database ready at ${env.dbPath}`)
console.log(`Tables: ${tables.join(', ')}`)
