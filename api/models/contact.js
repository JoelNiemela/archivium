const { executeQuery, parseData } = require('../utils');
const userapi = require('./user');
const utils = require('../../lib/hashUtils');

async function getOne(user, targetID) {
  try {
    const queryString = `
      SELECT 
        user.id, user.username, user.created_at, user.updated_at, contact.accepted, (contact.accepting_user = ?) AS is_request
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
    const users = await executeQuery(queryString, [user.id, user.id, user.id, targetID, user.id, targetID]);
    return [200, users[0]];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function getAll(user, includePending=true, includeAccepted=true) {
  if (!(includePending || includeAccepted)) return [400];

  const acceptClause = includePending === includeAccepted ? '' : `AND contact.accepted = ${includeAccepted}`;

  try {
    const queryString = `
      SELECT 
        user.id, user.username, user.created_at, user.updated_at, contact.accepted, (contact.accepting_user = ?) AS is_request
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
    console.error(err);
    return [500];
  }
}

async function post(user, username) {
  
  const [code, target] = await userapi.getOne({ username });
  console.log(target)
  if (!target) return [code];
  const [_, contact] = await getOne(user, target.id);
  console.log(contact)
  if (contact) return [200];

  const newContact = {
    requesting_user: user.id,
    accepting_user: target.id,
    accepted: false,
  };

  return [201, await executeQuery('INSERT INTO contact SET ?', newContact)];
}

module.exports = {
  getOne,
  getAll,
  post,
};