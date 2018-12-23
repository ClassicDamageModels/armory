import { query } from './driver'
import logger from '../logger'

const getNext = async () => {
  try {
    const result = await query(
      `SELECT * FROM queue WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 1`
    )

    if (result.rows) {
      return result.rows[0]
    } else {
      return false
    }
  } catch (err) {
    logger.error('Query failed', err)
  }
}

export { getNext }
