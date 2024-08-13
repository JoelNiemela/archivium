const { executeQuery, parseData, perms } = require('../utils');

async function getOne(user, options, permissionLevel) {
  const parsedOptions = parseData(options);

  const [code, data] = await getMany(user, parsedOptions, permissionLevel);
  if (code !== 200) return [code];
  const universe = data[0];
  if (!universe) return [user ? 403 : 401];
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
  if (!user) return [401];
  try {
    const conditionString = conditions ? `WHERE ${conditions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT 
        universe.*,
        JSON_OBJECTAGG(user.id, user.username) as authors,
        JSON_OBJECTAGG(user.id, au.permission_level) as author_permissions,
        owner.username as owner
      FROM universe
      INNER JOIN authoruniverse as au_filter
        ON universe.id = au_filter.universe_id AND (
          universe.public = 1 OR (au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionLevel})
        )
      LEFT JOIN authoruniverse as au ON universe.id = au.universe_id
      LEFT JOIN user ON user.id = au.user_id
      INNER JOIN user as owner ON universe.author_id = owner.id
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
    const queryString1 = `INSERT INTO universe SET ?`;
    const data = await executeQuery(queryString1, {
      title,
      shortname,
      author_id: user.id,
      public,
      obj_data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const queryString2 = `INSERT INTO authoruniverse SET ?`;
    return [201, [data, await executeQuery(queryString2, {
      universe_id: data.insertId,
      user_id: user.id,
      permission_level: 3,
    })]];
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return [400, 'universe.shortname must be unique.'];
    if (err.code === 'ER_BAD_NULL_ERROR') return [400, 'Missing parameters.'];
    console.error(err);
    return [500];
  }
}

async function putPermissions(user, shortname, targetUser, permission_level) {
  const [code, universe] = await getOne(user, { shortname });
  if (!universe) return [code];

  console.log(universe)
  let query;
  if (targetUser.id in universe.author_permissions) {
    query = executeQuery(`UPDATE authoruniverse SET ? WHERE user_id = ${targetUser.id} AND universe_id = ${universe.id};`, { permission_level });
  } else {
    query = executeQuery(`INSERT INTO authoruniverse SET ?`, { permission_level, universe_id: universe.id, user_id: targetUser.id });
  }

  try {
    return [200, await query];
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
  putPermissions,
};