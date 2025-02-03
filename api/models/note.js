const crypto = require('crypto');
const { executeQuery, parseData, perms } = require('../utils');
const logger = require('../../logger');
const itemapi = require('./item');
const universeapi = require('./universe');
const userapi = require('./user');

async function getOne(user, uuid) {
  // Direct note access is only allowed for our own notes.
  if (!user) return [401];

  try {
    const [code, notes] = await getMany(user, { 'note.uuid': uuid }, { limit: 1, inclBody: true });
    if (!notes) return [code];
    const note = notes[0];
    if (!note) return [404];
    if (note.author_id !== user.id) return [403];
    return [200, note];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

/**
 * This should never be called on it's own.
 * Users should only have access to notes in one of the following ways:
 * * they own the note,
 * * they have access to a board this note is pinned to, or,
 * * they have write access to an item this note is linked to.
 * @param {*} user 
 * @param {*} conditions 
 * @param {*} options 
 * @returns 
 */
async function getMany(user, conditions, options) {
  try {
    const parsedConds = parseData(conditions ?? {});
    parsedConds.strings.push('(note.public OR note.author_id = ?)');
    parsedConds.values.push(user?.id);
    const queryString = `
      SELECT
        note.id, note.uuid, note.title,
        note.body, note.public, note.author_id,
        note.created_at, note.updated_at
      FROM note
      ${options?.join ?? ''}
      WHERE ${parsedConds.strings.join(' AND ')}
      ${options?.limit ? `LIMIT ${options.limit}` : ''}
    `;
    const notes = await executeQuery(queryString, parsedConds.values);
    return [200, notes];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getByUsername(sessionUser, username, conditions) {
  try {
    const [code, user] = await userapi.getOne({ 'user.username': username });
    if (!user) return [code];
    const [_, notes] = await getMany(
      sessionUser,
      { ...(conditions ?? {}), 'note.author_id': user.id },
    );
    return [200, notes];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getByItemShortname(user, universeShortname, itemShortname, conditions={}, validate=true, inclAuthors=false) {
  try {
    const [code, item] = await itemapi.getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE, true);
    if (!item) return [code];
    const [_, notes] = await getMany(
      user,
      { ...conditions, 'itemnote.item_id': item?.id },
      { join: 'INNER JOIN itemnote ON itemnote.note_id = note.id' },
    );
    if (inclAuthors) {
      const queryString2 = `
        SELECT user.id, user.username, user.email
        FROM user
        INNER JOIN note ON user.id = note.author_id
        INNER JOIN itemnote ON itemnote.note_id = note.id
        WHERE itemnote.item_id = ?
        GROUP BY user.id`;
      const users = await executeQuery(queryString2, [ item.id ]);
      return [200, notes, users];
    }
    return [200, notes];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getBoardsByUniverseShortname(user, shortname) {
  try {
    const [code, universe] = await universeapi.getOne(user, { 'universe.shortname': shortname }, perms.WRITE);
    if (!universe) return [code];
    const boards = await executeQuery('SELECT * FROM noteboard WHERE universe_id = ?', [ universe.id ]);
    return [200, boards];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getByBoardShortname(user, shortname, conditions={}, validate=true, inclAuthors=false) {
  try {
    const board = await executeQuery('SELECT * FROM noteboard WHERE shortname = ?', [ shortname ]);
    if (!board) return [404];
    if (validate) {
      const [code, universe] = await universeapi.getOne(user, { 'universe.id': board.universe_id }, perms.WRITE);
      if (!universe) return [code];
    }
    const [_, notes] = await getMany(
      user,
      { ...conditions, 'boardnote.board_id': board.id },
      { join: 'INNER JOIN boardnote ON boardnote.note_id = note.id' },
    );
    if (inclAuthors) {
      const queryString2 = `
        SELECT user.id, user.username, user.email
        FROM user
        INNER JOIN note ON user.id = note.author_id
        INNER JOIN boardnote ON boardnote.note_id = note.id
        WHERE boardnote.board_id = ?
        GROUP BY user.id`;
      const users = await executeQuery(queryString2, [ board.id ]);
      return [200, notes, users];
    }
    return [200, notes];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function postBoard(user, { title, shortname }, universeShortname) {
  if (!user) return [401];
  try {
    const [code, universe] = await universeapi.getOne(user, { 'universe.shortname': universeShortname }, perms.WRITE);
    if (!universe) return [code];

    const queryString = `INSERT INTO noteboard (title, shortname, universe_id) VALUES (?, ?, ?);`;
    const data = await executeQuery(queryString, [ title, shortname, universe.id ]);
    return [201, data];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function post(user, { title, body, public }) {
  if (!user) return [401];
  try {
    const uuid = crypto.randomUUID();

    const queryString = `INSERT INTO note (uuid, title, body, public, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);`;
    const data = await executeQuery(queryString, [ uuid, title, body, public, user.id, new Date(), new Date() ]);
    return [201, data, uuid];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function put(user, uuid, { title, body, public }) {
  const [code, note] = await getOne(user, uuid);
  if (!note) return [code];

  try {
    const queryString = `
      UPDATE note
      SET
        title = ?,
        body = ?,
        public = ?
      WHERE uuid = ?;
    `;
    const data = await executeQuery(queryString, [ title, body, public, note.uuid ]);
    return [200, data];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function linkToBoard(user, boardShortname, noteUuid) {
  if (!noteUuid) return [400];
  if (!user) return [401];
  const board = await executeQuery('SELECT * FROM noteboard WHERE shortname = ?', [ boardShortname ]);
  if (!board) return [404];
  const [code2, note] = await getOne(user, noteUuid);
  if (!note) return [code2];

  try {
    const queryString = `INSERT INTO boardnote (board_id, note_id) VALUES (?, ?)`;
    await executeQuery(queryString, [ board.id, note.id ])
    return [201];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function linkToItem(user, universeShortname, itemShortname, noteUuid) {
  if (!noteUuid) return [400];
  if (!user) return [401];
  const [code, item] = await itemapi.getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE, true)
  if (!item) return [code];
  const [code2, note] = await getOne(user, noteUuid);
  if (!note) return [code2];

  try {
    const queryString = `INSERT INTO itemnote (item_id, note_id) VALUES (?, ?)`;
    await executeQuery(queryString, [ item.id, note.id ])
    return [201];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

module.exports = {
  getOne,
  getByUsername,
  getByItemShortname,
  getBoardsByUniverseShortname,
  getByBoardShortname,
  postBoard,
  post,
  put,
  linkToBoard,
  linkToItem,
};
