const { executeQuery, parseData } = require('../utils');
const userapi = require('./user');
const logger = require('../../logger');

async function getOne(sessionUser, targetID) {
  try {
    const queryString = `
      SELECT 
        user.id,
        user.username,
        user.email,
        user.created_at,
        user.updated_at,
        contact.accepted,
        (contact.accepting_user = ?) AS is_request,
        contact.requesting_user AS requesting_id,
        contact.accepting_user AS accepting_id
      FROM contact
      INNER JOIN user
      WHERE 
        user.id <> ? 
        AND (
          user.id = contact.requesting_user
          OR user.id = contact.accepting_user
        )
        AND (
          (contact.requesting_user = ? AND contact.accepting_user = ?)
          OR (contact.accepting_user = ? AND contact.requesting_user = ?)
        );
    `;
    const user = (await executeQuery(queryString, [sessionUser.id, sessionUser.id, sessionUser.id, targetID, sessionUser.id, targetID]))[0];
    if (!user) return [404];
    return [200, user];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getAll(user, includePending=true, includeAccepted=true) {
  if (!(includePending || includeAccepted)) return [400];

  const acceptClause = includePending === includeAccepted ? '' : `AND contact.accepted = ${includeAccepted}`;

  try {
    const queryString = `
      SELECT 
        user.id, user.username, user.email, user.created_at, user.updated_at, contact.accepted, (contact.accepting_user = ?) AS is_request
      FROM contact
      INNER JOIN user
      WHERE 
        user.id <> ? 
        AND (
          user.id = contact.requesting_user
          OR user.id = contact.accepting_user
        )
        AND (contact.requesting_user = ? OR contact.accepting_user = ?)
        ${acceptClause};
    `;
    const users = await executeQuery(queryString, [user.id, user.id, user.id, user.id]);
    return [200, users];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function post(user, username) {
  
  const [code, target] = await userapi.getOne({ username });
  if (!target) return [code];
  const [_, contact] = await getOne(user, target.id);
  if (contact) return [200];

  const queryString = `
    INSERT INTO contact (
      requesting_user,
      accepting_user, 
      accepted
    ) VALUES (?, ?, ?);
  `;

  return [201, await executeQuery(queryString, [user.id, target.id, false])];
}

async function put(user, username, accepted) {
  
  const [code, target] = await userapi.getOne({ username });
  if (!target) return [code];
  const [_, contact] = await getOne(user, target.id);
  if (!contact) return [404];

  if (accepted) {
    return [201, await executeQuery(`
      UPDATE contact SET accepted = ?
      WHERE
        requesting_user = ${contact.requesting_id}
        AND accepting_user = ${contact.accepting_id};
    `, [true])];
  } else {
    return await del(user, target.id);
  }
}

async function del(user, targetID) {

  const [code, contact] = await getOne(user, targetID);
  if (!contact) return [code];

  try {  
    if (contact) {
      return [200, await executeQuery(`
        DELETE FROM contact
        WHERE 
          requesting_user = ${contact.requesting_id}
          AND accepting_user = ${contact.accepting_id};
      `)];
    } else {
      return [404];
    }
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function delByUsername(user, username) {
  const [code, target] = await userapi.getOne({ username });
  if (!target) return [code];

  return await del(user, target.id);
}

module.exports = {
  getOne,
  getAll,
  post,
  put,
  del,
  delByUsername,
};