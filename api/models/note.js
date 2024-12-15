const { executeQuery, parseData, perms } = require('../utils');
const logger = require('../../logger');
const itemapi = require('./item');

async function getNotesByItem(user, itemId, validate=true, inclAuthors=false) {
  try {
    if (validate) {
      const [code, item] = await itemapi.getOne(user, itemId, permissionLevel, true);
      if (!item) return [code];
    }
    const queryString1 = `
      SELECT note.*
      FROM note
      INNER JOIN itemnote AS in ON in.note_id = note.id
      WHERE in.item_id = ?`;
    const notes = await executeQuery(queryString1, [ itemId ]);
    if (inclAuthors) {
      const queryString2 = `
        SELECT user.id, user.username, user.email
        FROM user
        INNER JOIN note ON user.id = note.author_id
        INNER JOIN itemnote AS in ON in.note_id = note.id
        WHERE in.item_id = ?
        GROUP BY user.id`;
      const users = await executeQuery(queryString2, [ itemId ]);
      return [200, notes, users];
    }
    return [200, notes];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function postNoteToItem(user, universeShortname, itemShortname, bodyText) {
  const [code, item] = await itemapi.getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.COMMENT, true)
  if (!item) return [code];
  if (!body) return [400];

  try {
    const queryString1 = `INSERT INTO note (body, author_id, created_at, updated_at) VALUES (?, ?, ?, ?);`;
    const data = await executeQuery(queryString1, [ bodyText, user.id, new Date(), new Date() ]);
    const queryString2 = `INSERT INTO itemnote (item_id, note_id) VALUES (?, ?)`;
    await executeQuery(queryString2, [ item.id, data.insertId ])
    return [201, data];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

module.exports = {
  getNotesByItem,
  postNoteToItem,
};
