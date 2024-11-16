const { executeQuery, parseData, perms } = require('../utils');
const universeapi = require('./universe');

async function getThreads(user, options, permissionLevel=perms.READ, includeExtra=false) {
  try {
    const parsedOptions = parseData(options);
    const readOnlyQueryString = permissionLevel > perms.READ ? '' : `universe.public = 1`;
    const usrQueryString = user ? `(au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionLevel})` : '';
    const permsQueryString = `${readOnlyQueryString}${(readOnlyQueryString && usrQueryString) ? ' OR ' : ''}${usrQueryString}`;
    const conditionString = options ? `WHERE ${parsedOptions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT
        ${includeExtra ? 'comments.*,' : ''}
        discussion.*
      FROM discussion
      INNER JOIN universe ON universe.id = discussion.universe_id
      INNER JOIN authoruniverse as au_filter
        ON universe.id = au_filter.universe_id AND (
          ${permsQueryString}
        )
      LEFT JOIN authoruniverse as au ON universe.id = au.universe_id
      ${includeExtra ? `
        LEFT JOIN (
          SELECT DISTINCT
            COUNT(comment.id) as comment_count,
            MIN(comment.created_at) as first_activity,
            MAX(comment.created_at) as last_activity,
            tc.thread_id
          FROM comment
          INNER JOIN threadcomment AS tc ON tc.comment_id = comment.id
          GROUP BY thread_id
        ) comments ON comments.thread_id = discussion.id
      ` : ''}
      ${conditionString}
      GROUP BY discussion.id;`;
    const data = await executeQuery(queryString, options && parsedOptions.values);
    return [200, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function getCommentsByThread(user, threadId, validate=true, inclCommenters=false, permissionLevel=perms.READ) {
  try {
    if (validate) {
      const [code, threads] = await getThreads(user, { 'discussion.id': threadId }, permissionLevel);
      const thread = threads[0];
      if (!thread) return [code];
    }
    const queryString1 = `
      SELECT comment.*
      FROM comment
      INNER JOIN threadcomment AS tc ON tc.comment_id = comment.id
      WHERE tc.thread_id = ?`;
    const comments = await executeQuery(queryString1, [ threadId ]);
    if (inclCommenters) {
      const queryString2 = `
        SELECT user.id, user.username, user.email
        FROM user
        INNER JOIN comment ON user.id = comment.author_id
        INNER JOIN threadcomment AS tc ON tc.comment_id = comment.id
        WHERE tc.thread_id = ?
        GROUP BY user.id`;
      const users = await executeQuery(queryString2, [ threadId ]);
      return [200, comments, users];
    }
    return [200, comments];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function postUniverseThread(user, universeShortname, { title }) {
  const [code, universe] = await universeapi.getOne(user, { shortname: universeShortname }, perms.COMMENT);
  if (!universe) return [code];
  if (!universe.discussion_enabled) return [403];
  if (!title) return [400, 'Title is required for universe discussion threads.'];

  try {
    const queryString = `INSERT INTO discussion (title, universe_id) VALUES (?, ?);`;
    const data = await executeQuery(queryString, [ title, universe.id ]);
    return [201, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function postCommentToThread(user, threadId, { body, reply_to }) {
  const [code, threads] = await getThreads(user, { 'discussion.id': threadId }, perms.COMMENT);
  const thread = threads[0];
  if (!thread) return [code];
  if (!body) return [400];

  try {
    const queryString1 = `INSERT INTO comment (body, author_id, reply_to, created_at) VALUES (?, ?, ?, ?);`;
    const data = await executeQuery(queryString1, [ body, user.id, reply_to ?? null, new Date() ]);
    const queryString2 = `INSERT INTO threadcomment (thread_id, comment_id) VALUES (?, ?)`;
    await executeQuery(queryString2, [ thread.id, data.insertId ])
    return [201, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getThreads,
  getCommentsByThread,
  postUniverseThread,
  postCommentToThread,
};
