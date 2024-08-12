const { executeQuery, parseData, perms } = require('../utils');

async function getOne(user, id, permissionsRequired=perms.READ) {

  const conditions = { 
    strings: [
      'item.id = ?',
    ], values: [
      id,
    ]
  };

  const [errCode, data] = await getMany(user, conditions, permissionsRequired);
  if (data) return [errCode];
  const item = data[0];
  if (!item) return [user ? 403 : 401];
  return [200, item];
}

async function getMany(user, conditions, permissionsRequired=perms.READ) {
  try {
    const usrQueryString = user ? ` OR (au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionsRequired})` : '';
    const conditionString = conditions ? `WHERE ${conditions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT 
        item.*,
        user.username as author,
        universe.title as universe
      FROM item
      INNER JOIN user ON user.id = item.author_id
      INNER JOIN universe ON universe.id = item.universe_id
      INNER JOIN authoruniverse as au_filter ON universe.id = au_filter.universe_id AND (universe.public = 1${usrQueryString})
      ${conditionString}
      GROUP BY 
        item.id,
        user.username,
        universe.title;`;
    const data = await executeQuery(queryString, conditions && conditions.values);
    return [200, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function getByUniverseId(user, universeId, permissionsRequired=perms.READ) {

  const conditions = { 
    strings: [
      'item.universe_id = ?',
    ], values: [
      universeId,
    ]
  };

  const [errCode, items] = await getMany(user, conditions, permissionsRequired);
  if (!items) return [errCode];
  return [200, items];
}

async function getByUniverseAndItemIds(user, universeId, itemId, permissionsRequired=perms.READ) {

  const conditions = { 
    strings: [
      'item.universe_id = ?',
      'item.id = ?',
    ], values: [
      universeId,
      itemId,
    ]
  };

  const [errCode, data] = await getMany(user, conditions, permissionsRequired);
  if (!data) return [errCode];
  const item = data[0];
  if (!item) return [user ? 403 : 401];
  return [200, item];
}

async function getByUniverseShortname(user, shortname, type, permissionsRequired=perms.READ) {

  const conditions = { 
    strings: [
      'universe.shortname = ?',
    ], values: [
      shortname,
    ]
  };

  if (type) {
    conditions.strings.push('item.item_type = ?');
    conditions.values.push(type);
  }

  const [errCode, items] = await getMany(user, conditions, permissionsRequired);
  if (!items) return [errCode];
  return [200, items];
}

async function getByUniverseAndItemShortnames(user, universeShortname, itemShortname, permissionsRequired=perms.READ) {

  const conditions = { 
    strings: [
      'universe.shortname = ?',
      'item.shortname = ?',
    ], values: [
      universeShortname,
      itemShortname,
    ]
  };

  const [errCode, data] = await getMany(user, conditions, permissionsRequired);
  if (!data) return [errCode];
  const item = data[0];
  if (!item) return [user ? 403 : 401];
  return [200, item];
}

async function post(user, body, universeShortName) {

  let universeId;
  try {
    // TODO - ACTUALLY VALIDATE PERMISSIONS HERE!
    universeId = (await executeQuery('SELECT id FROM universe WHERE shortname = ?', [ universeShortName ]))[0]?.id;
    if (universeId === undefined) return [404];
  } catch (err) {
    console.error(err);
    return [500];
  }

  try {
    const queryString = `INSERT INTO item SET ?`;
    const { title, shortname, item_type, parent_id, obj_data } = body;
    if (!title || !shortname || !item_type || !obj_data) return [400];
    return [201, await executeQuery(queryString, {
      title,
      shortname,
      item_type,
      author_id: user.id,
      universe_id: universeId,
      parent_id,
      obj_data,
      created_at: new Date(),
      updated_at: new Date(),
    })];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function put(user, universeShortname, itemShortname, changes) {
  const { title, obj_data } = changes;

  if (!title || !obj_data) return [400];
  const [code, item] = await getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE);
  if (!item) return [code];

  try {
    return [200, await executeQuery(`UPDATE item SET ? WHERE id = ${item.id};`, { title, obj_data })];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getOne,
  getMany,
  getByUniverseId,
  getByUniverseAndItemIds,
  getByUniverseShortname,
  getByUniverseAndItemShortnames,
  post,
  put,
};