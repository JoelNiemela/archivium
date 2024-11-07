const { executeQuery, parseData, perms } = require('../utils');

async function getOne(user, options, permissionLevel) {
  const parsedOptions = parseData(options);

  const [code, data] = await getMany(user, parsedOptions, permissionLevel);
  if (code !== 200) return [code];
  const universe = data[0];
  if (!universe) return [user ? 403 : 401];
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
    console.error(err);
    return [500];
  }
}

function getManyByAuthorId(user, authorId) {
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
      perms.READ,
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

async function post(user, body) {
  try {
    const { title, shortname, public, obj_data } = body;
    if (!(title && shortname)) return [400, 'Missing parameters.'];
    const queryString1 = `
      INSERT INTO universe (
        title,
        shortname,
        author_id,
        public,
        obj_data,
        created_at,
        updated_at,
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const data = await executeQuery(queryString1, [
      title,
      shortname,
      user.id,
      public,
      obj_data,
      new Date(),
      new Date(),
    ]);
    const queryString2 = `INSERT INTO authoruniverse (universe_id, user_id, permission_level) VALUES (?, ?, ?)`;
    return [201, [data, await executeQuery(queryString2, [ data.insertId, user.id, 3 ])]];
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return [400, 'universe.shortname must be unique.'];
    if (err.code === 'ER_BAD_NULL_ERROR') return [400, 'Missing parameters.'];
    console.error(err);
    return [500];
  }
}

async function put(user, shortname, changes) {
  const { title, public, obj_data } = changes;

  if (!title) return [400];
  const [code, universe] = await getOne(user, { shortname }, perms.WRITE);
  if (!universe) return [code];

  try {
    const queryString = `
      UPDATE universe
      SET
        title = ?,
        public = ?,
        obj_data = ?,
        updated_at = ?
      WHERE id = ?;
    `;
    return [200, await executeQuery(queryString, [ title, public, obj_data, new Date(), universe.id ])];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function putPermissions(user, shortname, targetUser, permission_level) {
  const [code, universe] = await getOne(user, { shortname }, perms.ADMIN);
  if (!universe) return [code];

  let query;
  if (targetUser.id in universe.author_permissions) {
    query = executeQuery(`
      UPDATE authoruniverse 
      SET permission_level = ? 
      WHERE user_id = ? AND universe_id = ?;`,
      [ permission_level, targetUser.id, universe.id ],
    );
  } else {
    query = executeQuery(`
      INSERT INTO authoruniverse (permission_level, universe_id, user_id) VALUES (?, ?, ?);`,
      [ permission_level, universe.id, targetUser.id ],
    );
  }

  try {
    return [200, await query];
  } catch (err) {
    console.error(err);
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
      INSERT INTO followeruniverse (is_following, universe_id, user_id) VALUES (?, ?, ?);`,
      [ isFollowing, universe.id, user.id ],
    );
  }

  try {
    return [200, await query];
  } catch (err) {
    console.error(err);
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
    console.error(err);
    return [500];
  }
}

module.exports = {
  perms,
  getOne,
  getMany,
  getManyByAuthorId,
  getManyByAuthorName,
  post,
  put,
  putPermissions,
  putUserFollowing,
  del,
};