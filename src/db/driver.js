import { types, Pool } from 'pg'
import Promise from 'bluebird'
import url from 'url'
import config from '../config'
import logger from '../logger'

const { auth, hostname, port, pathname } = url.parse(config.databaseUrl)
const [user, password] = auth.split(':')

const pool = new Pool({
  user,
  password,
  host: hostname,
  port,
  database: pathname.split('/')[1],
  ssl: process.env.NODE_ENV === 'production',
  max: 15,
  idleTimeoutMillis: 1000
})

pool.on('error', err => {
  logger.error('pool client error', err)
})

export async function connect() {
  return await pool.connect()
}

export function query(sql, params) {
  return pool.query(sql, params)
}

// Return dates as strings instead of Date objects
types.setTypeParser(1082, str => str)
