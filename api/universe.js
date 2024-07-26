const { executeQuery, parseData } = require('../db/utils');

const perms = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
};

/**
 * base function for fetching universes from database
 * @param {*} user 
 * @param {*} conditions 
 * @param {number} permission_level
 * @returns 
 */
async function getMany(user, conditions, permission_level=perms.READ) {
  try {
    const usrQueryString = user ? ` OR universe_id IN (SELECT universe_id FROM authoruniverse as a WHERE a.user_id = ${user.id} AND a.permission_level >= ${permission_level})` : '';
    const conditionString = conditions ? ` AND ${conditions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT
        universe.*,
        JSON_OBJECTAGG(user.id, user.username) as authors,
        JSON_OBJECTAGG(user.id, authoruniverse.permission_level) as author_permissions,
        owner.username as owner
      FROM authoruniverse
      INNER JOIN user ON user.id = user_id
      INNER JOIN universe ON universe.id = universe_id 
      INNER JOIN user as owner ON universe.author_id = owner.id
      WHERE (universe.public = 1${usrQueryString})
      ${conditionString}
      GROUP BY universe_id;`;
    const data = await executeQuery(queryString, conditions && conditions.values);
    return [200, data];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
}

function getManyByAuthorId(user, authorId) {
  return getMany(user, { 
    strings: [
      'universe_id IN (SELECT universe_id FROM authoruniverse as au WHERE au.user_id = ? AND au.permission_level > 0)',
    ], values: [
      authorId,
    ] 
  });
}

module.exports = {
  perms,
  // getOne,
  getMany,
  getManyByAuthorId,
};