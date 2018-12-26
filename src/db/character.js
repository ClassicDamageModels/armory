import { query } from './driver'
import levenshtein from 'fast-levenshtein'
import _ from 'lodash'

const MAX_SEARCH_RESULTS = 10

const searchCharacters = async (name, realm) => {
  const characterName = name && name.toLowerCase()
  const realmName = realm && realm.toLowerCase()

  const result = await query(
    `SELECT
      c.name, c.level, c.race, c.class, concat_ws('/', tree1_pts, tree2_pts, tree3_pts) AS spec, c.sex, c.inspected_at AS seen,
      r.name AS realm,
      g.name as guild
    FROM character c
    LEFT JOIN realm r ON c.realm_id = r.id
    LEFT JOIN guild g ON c.guild_id = g.id
    WHERE LOWER(c.name) LIKE $1
    ${(realmName && 'AND LOWER(r.name) = $2') || ''}
    LIMIT ${MAX_SEARCH_RESULTS}`,
    realmName ? ['%' + characterName + '%', realmName] : ['%' + characterName + '%']
  )

  return _(result.rows)
    .orderBy(['level', character => levenshtein.get(character.name, name)], ['desc', 'asc'])
    .value()
}

const getCharacter = async (name, realm) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.level, c.race, c.class, concat_ws('/', tree1_pts, tree2_pts, tree3_pts) AS spec, c.sex, c.inspected_at AS seen,
        r.name AS realm,
        g.name as guild
      FROM character c
      LEFT JOIN realm r ON c.realm_id = r.id
      LEFT JOIN guild g ON c.guild_id = g.id
      WHERE LOWER(c.name) = $1 AND LOWER(r.name) = $2
      LIMIT 1`,
      [name.toLowerCase(), realm.toLowerCase()]
    )

    if (result.rows.length) {
      const itemsResult = await query(
        `SELECT slot, item, enchant, gem1, gem2, gem3 FROM itemslot WHERE character_id = $1`,
        [result.rows[0].id]
      )

      return {
        ...result.rows[0],
        items: itemsResult.rows
      }
    } else return {}
  } catch (error) {
    throw error
  }
}

export { searchCharacters, getCharacter }
