const { executeQuery, parseData } = require('../utils');
const utils = require('../../lib/hashUtils');

async function getAll(user, includePending=true, includeAccepted=true) {
  if (!(includePending || includeAccepted)) return [400];

  const acceptClause = includePending === includeAccepted ? '' : `AND contact.accepted = ${includeAccepted}`;

  try {
    const queryString = `
      SELECT 
        user.id, user.username, user.created_at, user.updated_at, contact.accepted
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
    const users = await executeQuery(queryString, [user.id, user.id, user.id]);
    return [200, users];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getAll,
};