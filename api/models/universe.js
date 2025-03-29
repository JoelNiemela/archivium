const { executeQuery, parseData, perms, getPfpUrl } = require('../utils');
const logger = require('../../logger');

async function getOne(user, options, permissionLevel=perms.READ) {
  if (!options) return [400];
  const conditions = parseData(options);
  const [code, data] = await getMany(user, conditions, permissionLevel);
  if (code !== 200) return [code];
  const universe = data[0];
  if (!universe) {
    const exists = (await executeQuery(`SELECT 1 FROM universe WHERE ${conditions.strings.join(' AND ')}`, conditions.values)).length > 0;
    return [exists ? (user ? 403 : 401) : 404];
  }
  universe.obj_data = JSON.parse(universe.obj_data);
  return [200, universe];
}

/**
 * base function for fetching universes from database
 * @param {*} user 
 * @param {*} conditions 
 * @param {number} permission_level
 * @returns 
 */
async function getMany(user, conditions, permissionLevel=perms.READ) {
  try {
    if (!user && permissionLevel > perms.READ) return [400];
    const readOnlyQueryString = permissionLevel > perms.READ ? '' : `universe.public = 1`;
    const usrQueryString = user ? `(au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionLevel})` : '';
    const permsQueryString = `${readOnlyQueryString}${(readOnlyQueryString && usrQueryString) ? ' OR ' : ''}${usrQueryString}`;
    const conditionString = conditions ? `WHERE ${conditions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT 
        universe.*,
        JSON_OBJECTAGG(author.id, author.username) AS authors,
        JSON_OBJECTAGG(author.id, au.permission_level) AS author_permissions,
        owner.username AS owner,
        JSON_REMOVE(JSON_OBJECTAGG(
          IFNULL(fu.user_id, 'null__'),
          fu.is_following
        ), '$.null__') AS followers
      FROM universe
      INNER JOIN authoruniverse AS au_filter
        ON universe.id = au_filter.universe_id AND (
          ${permsQueryString}
        )
      LEFT JOIN authoruniverse AS au ON universe.id = au.universe_id
      LEFT JOIN user AS author ON author.id = au.user_id
      LEFT JOIN followeruniverse AS fu ON universe.id = fu.universe_id
      INNER JOIN user AS owner ON universe.author_id = owner.id
      ${conditionString}
      GROUP BY universe.id;`;
    const data = await executeQuery(queryString, conditions && conditions.values);
    return [200, data];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

function getManyByAuthorId(user, authorId, permissionLevel=perms.WRITE) {
  return getMany(user, {
    strings: [`
      EXISTS (
        SELECT 1
        FROM authoruniverse as au_check
        WHERE au_check.universe_id = universe.id
        AND (au_check.user_id = ? AND au_check.permission_level >= ?)
      )
    `], values: [
      authorId,
      permissionLevel,
    ] 
  });
}

function getManyByAuthorName(user, authorName) {
  return getMany(user, {
    strings: [`
      EXISTS (
        SELECT 1
        FROM authoruniverse as au_check
        WHERE au_check.universe_id = universe.id
        AND (au_check.username = ? AND au_check.permission_level >= ?)
      )
    `], values: [
      authorName,
      perms.READ,
    ] 
  });
}

async function getEventsByUniverseShortname(user, shortname, permissionsRequired=perms.READ) {
  const [code, universe] = await getOne(user, { 'universe.shortname': shortname }, permissionsRequired);
  if (!universe) return [code];

  try {
    const queryString = `
      SELECT
        itemevent.event_title, itemevent.abstime,
        item.shortname AS src_shortname, item.title AS src_title, item.id AS src_id
      FROM itemevent
      INNER JOIN item on item.id = itemevent.item_id
      WHERE item.universe_id = ?
    `;
    return [200, await executeQuery(queryString, [universe.id])];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

function validateShortname(shortname, reservedShortnames = []) {

  if (shortname.length < 3 || shortname.length > 64) {
    return 'Shortnames must be between 3 and 64 characters long.';
  }

  if (reservedShortnames.includes(shortname)) {
      return 'This shortname is reserved and cannot be used.';
  }

  if (/^[-]|[-]$/.test(shortname)) {
    return 'Shortnames cannot start or end with a dash.';
  }

  if (!/^[a-zA-Z0-9-]+$/.test(shortname)) {
      return 'Shortnames can only contain letters, numbers, and hyphens.';
  }

  return null;
}

async function post(user, body) {
  try {
    const { title, shortname, public, discussion_enabled, discussion_open, obj_data } = body;

    const shortnameError = validateShortname(shortname);
    if (shortnameError) return [400, shortnameError];
    if (!title) return [400, 'Title is required.'];

    const queryString1 = `
      INSERT INTO universe (
        title,
        shortname,
        author_id,
        public,
        discussion_enabled,
        discussion_open,
        obj_data,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const data = await executeQuery(queryString1, [
      title,
      shortname,
      user.id,
      public,
      discussion_enabled,
      discussion_open,
      obj_data,
      new Date(),
      new Date(),
    ]);
    const queryString2 = `INSERT INTO authoruniverse (universe_id, user_id, permission_level) VALUES (?, ?, ?)`;
    return [201, [data, await executeQuery(queryString2, [ data.insertId, user.id, perms.ADMIN ])]];
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return [400, 'Universe shortname must be unique.'];
    if (err.code === 'ER_BAD_NULL_ERROR') return [400, 'Missing parameters.'];
    logger.error(err);
    return [500];
  }
}

async function put(user, shortname, changes) {
  const { title, public, discussion_enabled, discussion_open, obj_data } = changes;

  if (!title) return [400];
  const [code, universe] = await getOne(user, { shortname }, perms.WRITE);
  if (!universe) return [code];

  try {
    const queryString = `
      UPDATE universe
      SET
        title = ?,
        public = ?,
        discussion_enabled = ?,
        discussion_open = ?,
        obj_data = ?,
        updated_at = ?
      WHERE id = ?
    `;
    return [200, await executeQuery(queryString, [ title, public, discussion_enabled, discussion_open, obj_data, new Date(), universe.id ])];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function putPermissions(user, shortname, targetUser, permission_level) {
  const [code, universe] = await getOne(user, { shortname }, perms.ADMIN);
  if (!universe) return [code];

  if (universe.author_permissions[targetUser.id] === perms.ADMIN && permission_level < perms.ADMIN) {
    let adminWouldStillExist = false;
    for (const userID in universe.author_permissions) {
      if (Number(userID) !== Number(targetUser.id) && universe.author_permissions[userID] === perms.ADMIN) {
        adminWouldStillExist = true;
        break;
      }
    }
    if (!adminWouldStillExist) return [400];
  }

  let query;
  if (targetUser.id in universe.author_permissions) {
    query = executeQuery(`
      UPDATE authoruniverse 
      SET permission_level = ? 
      WHERE user_id = ? AND universe_id = ?`,
      [ permission_level, targetUser.id, universe.id ],
    );
  } else {
    query = executeQuery(`
      INSERT INTO authoruniverse (permission_level, universe_id, user_id) VALUES (?, ?, ?)`,
      [ permission_level, universe.id, targetUser.id ],
    );
  }

  try {
    await executeQuery(
      'DELETE FROM universeaccessrequest WHERE universe_id = ? AND user_id = ?',
      [universe.id, targetUser.id],
    );

    return [200, await query];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function putUserFollowing(user, shortname, isFollowing) {
  if (!user) return [401];
  const [code, universe] = await getOne(user, { shortname }, perms.READ);
  if (!universe) return [code];

  let query;
  if (user.id in universe.followers) {
    query = executeQuery(`
      UPDATE followeruniverse 
      SET is_following = ? 
      WHERE user_id = ? AND universe_id = ?;`,
      [ isFollowing, user.id, universe.id ],
    );
  } else {
    query = executeQuery(`
      INSERT INTO followeruniverse (is_following, universe_id, user_id) VALUES (?, ?, ?)`,
      [ isFollowing, universe.id, user.id ],
    );
  }

  try {
    return [200, await query];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getUserAccessRequest(user, shortname) {
  if (!user) return [401];
  
  try {
    const universe = (await executeQuery('SELECT * FROM universe WHERE shortname = ?', [shortname]))[0];
    if (!universe) return [404];

    const request = (await executeQuery(
      'SELECT * FROM universeaccessrequest WHERE universe_id = ? AND user_id = ?',
      [universe.id, user.id],
    ))[0];
    if (!request) return [404];

    return [200, request];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getAccessRequests(user, shortname) {
  if (!user) return [401];
  
  try {
    const [code, universe] = await getOne(user, { shortname }, perms.ADMIN);
    if (!universe) return [code];

    const requests = await executeQuery(
      'SELECT ua.*, user.username FROM universeaccessrequest ua INNER JOIN user ON user.id = ua.user_id WHERE ua.universe_id = ?',
      [universe.id],
    );

    return [200, requests];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function putAccessRequest(user, shortname, permissionLevel) {
  if (!user) return [401];
  
  try {
    const universe = (await executeQuery('SELECT * FROM universe WHERE shortname = ?', [shortname]))[0];
    if (!universe) return [404];

    const [, request] = await getUserAccessRequest(user, shortname);
    if (request) {
      if (request.permission_level >= permissionLevel) return [200];
      else await delAccessRequest(user, shortname, user);
    } 

    const data = await executeQuery(
      'INSERT INTO universeaccessrequest (universe_id, user_id, permission_level) VALUES (?, ?, ?)',
      [universe.id, user.id, permissionLevel],
    );

    return [201, data];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function delAccessRequest(user, shortname, requestingUser) {
  if (!user) return [401];
  if (!requestingUser) return [400];
  const [code, permsUniverse] = await getOne(user, { shortname }, perms.ADMIN);
  if (!(permsUniverse || (code === 403 && user.id === requestingUser.id))) return [code];
  
  try {
    const universe = (await executeQuery('SELECT * FROM universe WHERE shortname = ?', [shortname]))[0];
    await executeQuery(
      'DELETE FROM universeaccessrequest WHERE universe_id = ? AND user_id = ?',
      [universe.id, requestingUser.id],
    );

    return [200];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function del(user, shortname) {
  const [code, universe] = await getOne(user, { shortname }, perms.ADMIN);
  if (!universe) return [code];

  const itemCount = (await executeQuery(`SELECT COUNT(id) as count FROM item WHERE universe_id = ?;`, [universe.id]))[0].count;
  if (itemCount > 0) {
    return [409, 'Cannot delete universe, universe not empty.'];
  }

  try {
    await executeQuery(`DELETE FROM authoruniverse WHERE universe_id = ?;`, [universe.id]);
    await executeQuery(`DELETE FROM universe WHERE id = ?;`, [universe.id]);
    return [200];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

module.exports = {
  getOne,
  getMany,
  getManyByAuthorId,
  getManyByAuthorName,
  getEventsByUniverseShortname,
  validateShortname,
  post,
  put,
  putPermissions,
  putUserFollowing,
  getUserAccessRequest,
  getAccessRequests,
  putAccessRequest,
  delAccessRequest,
  del,
};