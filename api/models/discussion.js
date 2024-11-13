const { executeQuery, parseData, perms } = require('../utils');
const universeapi = require('./universe');

async function getThread(user, options, permissionLevel=perms.READ) {
  try {
    const parsedOptions = parseData(options);
    const readOnlyQueryString = permissionLevel > perms.READ ? '' : `universe.public = 1`;
    const usrQueryString = user ? `(au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionLevel})` : '';
    const permsQueryString = `${readOnlyQueryString}${(readOnlyQueryString && usrQueryString) ? ' OR ' : ''}${usrQueryString}`;
    const conditionString = options ? `WHERE ${parsedOptions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT discussion.*
      FROM universethread
      INNER JOIN discussion ON discussion.id = universethread.thread_id
      INNER JOIN universe ON universe.id = universethread.universe_id
      INNER JOIN authoruniverse as au_filter
        ON universe.id = au_filter.universe_id AND (
          ${permsQueryString}
        )
      LEFT JOIN authoruniverse as au ON universe.id = au.universe_id
      ${conditionString}
      GROUP BY discussion.id;`;
    const data = await executeQuery(queryString, options && parsedOptions.values);
    return [200, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function postUniverseThread(user, universeShortname, { title }) {
  const [code, universe] = await universeapi.getOne(user, { shortname: universeShortname }, perms.COMMENT);
  if (!universe) return [code];
  if (!universe.discussion_enabled) return [403];

  try {
    const queryString1 = `INSERT INTO discussion (title) VALUES (?);`;
    const data = await executeQuery(queryString1, [ title ?? null ]);
    const queryString2 = `INSERT INTO universethread (universe_id, thread_id) VALUES (?, ?)`;
    return [201, [data, await executeQuery(queryString2, [ universe.id, data.insertId ])]];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getThread,
  postUniverseThread,
};