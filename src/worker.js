import fs from 'fs'
import _ from 'lodash'
import { promisify } from 'util'
import config from './config'
import logger from './logger'
import { query } from './db/driver'
import { getNext } from './db/queue'
import parser from 'luaparse'

let processing = false
const read = promisify(fs.readFile)

setInterval(async () => {
  if (!processing) {
    try {
      const next = await getNext()

      if (next) {
        processing = true
        const buffer = await read(`${config.uploadDir}/${next.filename}`)

        const data = parser.parse(buffer.toString())

        const playerData = data.body[0].init[0].fields
          .filter(p => p.key.value !== 'OnlineData')
          .map(p => {
            const name = p.key.value
            const itemsData = _.get(
              _.find(p.value.fields, c => c.key && c.key.value === 'ItemsData'),
              'value.value'
            )
            const dateData = _.get(
              _.find(p.value.fields, c => c.key && c.key.value === 'DateTimeUTC'),
              'value.value'
            )
            const talentsData = _.get(
              _.find(p.value.fields, c => c.key && c.key.value === 'TalentsData'),
              'value.value'
            )
            const playerData = _.get(
              _.find(p.value.fields, c => c.key && c.key.value === 'PlayerData'),
              'value.value'
            )

            return {
              name,
              itemsData,
              dateData,
              talentsData,
              playerData
            }
          })
          .map(entry => {
            const items = entry.itemsData
              .split(',')
              .slice(0, -1)
              .map(itemData => {
                const [slotId, item, enchant, gem1, gem2, gem3, ...rest] = itemData.split(':')

                const slots = [
                  'head',
                  'amulet',
                  'shoulders',
                  'shirt',
                  'chest',
                  'belt',
                  'legs',
                  'boots',
                  'bracers',
                  'hands',
                  'ring1',
                  'ring2',
                  'trinket1',
                  'trinket2',
                  'cloak',
                  'weapon1',
                  'weapon2',
                  'ranged',
                  'tabard'
                ]

                return {
                  slot: slots[slotId],
                  id: parseInt(item),
                  enchant: parseInt(enchant),
                  gem1: parseInt(gem1),
                  gem2: parseInt(gem2),
                  gem3: parseInt(gem3)
                }
              })

            const [
              race,
              className,
              guild,
              guildTitle,
              guildRank,
              sex,
              level,
              realm
            ] = entry.playerData.split(':')

            return {
              name: entry.name,
              level,
              race: race.toLowerCase(),
              class: className.toLowerCase(),
              guild: guild === 'nil' ? '' : guild,
              guildRank,
              sex: sex === 2 ? 'male' : 'female',
              date: new Date(entry.dateData),
              items,
              talents: entry.talentsData,
              realm: realm.replace(/#/, '')
            }
          })

        const realms = _.uniq(playerData.map(p => p.realm))
        const guilds = _.uniq(
          playerData.filter(p => p.guild).map(p => ({ name: p.guild, realm: p.realm }))
        )

        realms.forEach(async realm => {
          const realmResult = await query('SELECT id FROM realm WHERE name = $1 LIMIT 1', [realm])
          if (!realmResult.rows.length) {
            await query('INSERT INTO realm (name) VALUES ($1)', [realm])
          }
        })

        guilds.forEach(async guild => {
          const realmResult = await query('SELECT id FROM realm WHERE name = $1 LIMIT 1', [
            guild.realm
          ])

          const guildResult = await query('SELECT * FROM guild WHERE name = $1 AND realm_id = $2', [
            guild.name,
            realmResult.rows[0].id
          ])

          if (!guildResult.rows.length) {
            await query('INSERT INTO guild (name, realm_id) VALUES ($1, $2)', [
              guild.name,
              realmResult.rows[0].id
            ])
          }
        })

        playerData.forEach(async character => {
          const realmResult = await query('SELECT id FROM realm WHERE name = $1 LIMIT 1', [
            character.realm
          ])

          console.log('const realmResult', realmResult)

          const guildResult = await query('SELECT * FROM guild WHERE name = $1 AND realm_id = $2', [
            character.guild,
            realmResult.rows[0].id
          ])

          const guild = character.guild ? guildResult.rows[0].id : null

          const characterUpsertResult = await query(
            `INSERT INTO character (realm_id, name, level, race, class,
              sex, guild_id, guild_rank, inspected_at, seen_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (name, realm_id)
            DO UPDATE SET level = $3, race = $4, class = $5, sex = $6,
            guild_id = $7, guild_rank = $8, inspected_at = $9, seen_by = $10 RETURNING id`,
            [
              realmResult.rows[0].id,
              character.name,
              character.level,
              character.race,
              character.class,
              character.sex,
              guild,
              character.guildRank,
              character.date,
              next.uploader_id
            ]
          )

          if (characterUpsertResult.rows.length) {
            character.items.forEach(async item => {
              console.log(item)

              await query(
                `INSERT INTO itemslot (character_id, slot, item, enchant, gem1, gem2, gem3)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (character_id, slot)
              DO UPDATE SET item = $3, enchant = $4, gem1 = $5, gem2 = $6, gem3 = $6`,
                [
                  characterUpsertResult.rows[0].id,
                  item.slot,
                  item.id,
                  item.enchant,
                  item.gem1,
                  item.gem2,
                  item.gem3
                ]
              )
            })
            logger.info(`Inserted/updated character #${characterUpsertResult.rows[0].id}!`)

            await query('UPDATE queue SET processed_at = NOW() WHERE id = $1', [next.id])

            processing = false
          }
        })
      } else {
        logger.info('No new jobs')
      }
    } catch (err) {
      processing = false
      console.log(err)
      logger.error('Failed queue process job')
    }
  }
}, 1000)
