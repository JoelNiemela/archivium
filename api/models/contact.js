const { executeQuery, parseData, getPfpUrl } = require('../utils');
const userapi = require('./user');
const notification = require('./notification');
const logger = require('../../logger');

async function getOne(sessionUser, targetID) {
  if (!sessionUser) return [401];

  try {
    const queryString = `
      SELECT 
        user.id,
        user.username,
        user.email,
        user.created_at,
        user.updated_at,
        (ui.user_id IS NOT NULL) as hasPfp,
        contact.accepted,
        (contact.accepting_user = ?) AS is_request,
        contact.requesting_user AS requesting_id,
        contact.accepting_user AS accepting_id
      FROM contact
      INNER JOIN user
      LEFT JOIN userimage AS ui ON user.id = ui.user_id
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
  if (!user) return [401];

  const acceptClause = includePending === includeAccepted ? '' : `AND contact.accepted = ${includeAccepted}`;

  try {
    const queryString = `
      SELECT 
        user.id, user.username, user.email, user.created_at, user.updated_at, contact.accepted,
        (contact.accepting_user = ?) AS is_request, (ui.user_id IS NOT NULL) as hasPfp
      FROM contact
      INNER JOIN user
      LEFT JOIN userimage AS ui ON user.id = ui.user_id
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
  
  const [code, target] = await userapi.getOne({ 'user.username': username });
  if (!target) return [code];
  if (target.id === user.id) return [400];
  const [_, contact] = await getOne(user, target.id);
  if (contact) return [200];

  try {
    const queryString = `
      INSERT INTO contact (
        requesting_user,
        accepting_user, 
        accepted
      ) VALUES (?, ?, ?);
    `;

    const result = await executeQuery(queryString, [user.id, target.id, false]);

    await notification.notify(target, notification.types.CONTACTS, {
      title: 'Contact Request',
      body: `${user.username} has sent you a contact request.`,
      icon: getPfpUrl(user),
      clickUrl: '/contacts',
    });

    return [201, result];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function put(user, username, accepted) {
  
  const [code, target] = await userapi.getOne({ 'user.username': username });
  if (!target) return [code];
  const [_, contact] = await getOne(user, target.id);
  if (!contact) return [404];

  try {
    let result;
    if (accepted) {
      result = await executeQuery(`
        UPDATE contact SET accepted = ?
        WHERE
          requesting_user = ${contact.requesting_id}
          AND accepting_user = ${contact.accepting_id};
      `, [true]);
    } else {
      result = await del(user, target.id);
    }

    await notification.notify(target, notification.types.CONTACTS, {
      title: `Contact Request ${accepted ? 'Accepted' : 'Rejected'}`,
      body: `${user.username} has ${accepted ? 'accepted' : 'rejected'} your contact request.`,
      icon: getPfpUrl(user),
      clickUrl: '/contacts',
    });

    return [200, result];
  } catch (err) {
    logger.error(err);
    return [500];
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
  const [code, target] = await userapi.getOne({ 'user.username': username });
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
