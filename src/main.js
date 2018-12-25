import express from 'express'
import bodyParser from 'body-parser'
import config from './config'
import logger from './logger'
import fs from 'fs'
import { promisify } from 'util'
import { query } from './db/driver'
import { searchCharacters, getCharacter } from './db/character'
import uuid from 'uuid/v1'
import sha1 from 'sha1'

import './worker'

const write = promisify(fs.writeFile)
const app = express()

app.use(bodyParser.text({ type: '*/*' }))

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.post('/upload', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM uploader WHERE api_key = $1 LIMIT 1`, [req.query.key])

    if (result.rows.length) {
      const uploader = result.rows[0]
      const checksum = sha1(req.body)

      const result2 = await query(`SELECT checksum FROM queue WHERE checksum = $1`, [checksum])

      if (!result2.rows.length) {
        const filename = uuid() + '.lua'

        await write(`${config.uploadDir}/${filename}`, req.body)
        await query(
          `INSERT INTO queue (filename, checksum, uploader_id, created_at) VALUES ($1, $2, $3, NOW())`,
          [filename, checksum, uploader.id]
        )
      }

      res.status(200).send({ status: 'ok' })
    } else {
      res.status(401).send()
    }
  } catch (err) {
    logger.error(err)
  }
})

app.get('/search', async (req, res) => {
  const name = req.query.name
  if (name.length) {
    const result = await searchCharacters(name, req.query.realm)
    res.status(200).json(result)
  } else {
    res.status(400).send({ message: 'Field "name" is required.' })
  }
})

app.get('/get', async (req, res) => {
  if (req.query.name.length && req.query.realm.length) {
    const result = await getCharacter(req.query.name, req.query.realm)
    res.status(200).json(result)
  } else {
    res.status(400).send({ message: 'Fields "name" and "realm" are required.' })
  }
})

app.listen(config.port, () => {
  logger.info(`Server listening at port ${config.port}!`)
})
