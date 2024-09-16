const { executeQuery, parseData, perms } = require('../utils');

async function getOne(user, id, permissionsRequired=perms.READ, basicOnly=false) {

  const conditions = { 
    strings: [
      'item.id = ?',
    ], values: [
      id,
    ]
  };

  const [errCode, data] = await getMany(user, conditions, permissionsRequired, basicOnly);
  if (data) return [errCode];
  const item = data[0];
  if (!item) return [user ? 403 : 401];
  return [200, item];
}

function getQuery(selectString='', usrQueryString='', joinString='', conditionString='', options={}) {
  return `
      SELECT
        item.id,
        item.title,
        item.shortname,
        item.item_type,
        item.created_at,
        item.updated_at,
        item.universe_id,
        user.username as author,
        universe.title as universe,
        universe.shortname as universe_short,
        ${selectString}
        tag.tags
      FROM item
      INNER JOIN user ON user.id = item.author_id
      INNER JOIN universe ON universe.id = item.universe_id
      INNER JOIN authoruniverse as au_filter ON universe.id = au_filter.universe_id AND (universe.public = 1${usrQueryString})
      LEFT JOIN (
        SELECT item_id, JSON_ARRAYAGG(tag) as tags
        FROM tag
        GROUP BY item_id
      ) tag ON tag.item_id = item.id
      ${joinString}
      ${conditionString}
      GROUP BY 
        item.id,
        user.username,
        universe.title
      ${options.sort ? `ORDER BY ${options.sort} ${options.sortDesc ? 'DESC' : 'ASC'}` : ''}
      ${options.limit ? `LIMIT ${options.limit}` : ''}`;
}

async function getMany(user, conditions, permissionsRequired=perms.READ, basicOnly=false, options={}) {
  if (options.type) {
    if (!conditions) conditions = { strings: [], values: [] };
    conditions.strings.push('item.item_type = ?');
    conditions.values.push(options.type);
  }

  if (options.tag) {
    if (!conditions) conditions = { strings: [], values: [] };
    conditions.strings.push('? IN (SELECT tag FROM tag WHERE item_id = item.id)');
    conditions.values.push(options.tag);
  }

  if (options.sort) {
    const validSorts = { 'title': true, 'created_at': true, 'updated_at': true, 'author': true, 'item_type': true };
    if (!validSorts[options.sort]) {
      delete options.sort;
    }
  }

  try {
    const usrQueryString = user ? ` OR (au_filter.user_id = ${user.id} AND au_filter.permission_level >= ${permissionsRequired})` : '';
    const conditionString = (
      conditions ? `WHERE ${conditions.strings.join(' AND ')}` : ''
    ) + (options.where ? (conditions ? ' AND ' : 'WHERE ') + options.where : '');
    const selectString = (basicOnly ? '' : `
      item.obj_data,
      JSON_REMOVE(JSON_OBJECTAGG(
        IFNULL(child_item.shortname, 'null__'),
        JSON_ARRAY(lineage_child.child_title, lineage_child.parent_title)
      ), '$.null__') as children,
      JSON_REMOVE(JSON_OBJECTAGG(
        IFNULL(parent_item.shortname, 'null__'),
        JSON_ARRAY(lineage_parent.parent_title, lineage_parent.child_title)
      ), '$.null__') as parents,
      JSON_REMOVE(JSON_OBJECTAGG(IFNULL(child_item.shortname, 'null__'), child_item.title), '$.null__') as child_titles,
      JSON_REMOVE(JSON_OBJECTAGG(IFNULL(parent_item.shortname, 'null__'), parent_item.title), '$.null__') as parent_titles,
    `) + (options.select ?? '');
    const joinString = (basicOnly ? '' : `
      LEFT JOIN lineage as lineage_child ON lineage_child.parent_id = item.id
      LEFT JOIN lineage as lineage_parent ON lineage_parent.child_id = item.id
      LEFT JOIN item as child_item ON child_item.id = lineage_child.child_id
      LEFT JOIN item as parent_item ON parent_item.id = lineage_parent.parent_id
    `) + (options.join ?? '');
    let queryString;
    if (options.search) {
      const condPref = conditionString ? ' AND ' : 'WHERE ';
      const extraSelects = 'universe.shortname as universe_short,';
      queryString = `
        ${getQuery(
          extraSelects + selectString,
          usrQueryString,
          joinString,
          conditionString + condPref + `item.title LIKE '%${options.search}%'`,
          options,
        )}
        UNION
        ${getQuery(
          extraSelects + selectString,
          usrQueryString,
          joinString,
          conditionString + condPref + `item.shortname LIKE '%${options.search}%'`,
          options,
        )}
        UNION
        ${getQuery(
          extraSelects + selectString,
          usrQueryString,
          joinString + ' INNER JOIN tag as search_tag ON search_tag.item_id = item.id',
          conditionString + condPref + `search_tag.tag = '%${options.search}%'`,
          options,
        )}
        UNION
        ${getQuery(
          extraSelects + selectString,
          usrQueryString,
          joinString + ' INNER JOIN tag as search_tag ON search_tag.item_id = item.id',
          conditionString + condPref + `search_tag.tag LIKE '%${options.search}%'`,
          options,
        )}
      `;
    } else {
      queryString = getQuery(selectString, usrQueryString, joinString, conditionString, options);
    }
    const data = await executeQuery(queryString, conditions && conditions.values);
    return [200, data];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function getByAuthorUsername(user, username, permissionsRequired, basicOnly, options) {

  const conditions = { 
    strings: [
      'user.username = ?',
    ], values: [
      username,
    ]
  };

  const [errCode, items] = await getMany(user, conditions, permissionsRequired, basicOnly, options);
  if (!items) return [errCode];
  return [200, items];
}

async function getByUniverseId(user, universeId, permissionsRequired, basicOnly, options) {

  const conditions = { 
    strings: [
      'item.universe_id = ?',
    ], values: [
      universeId,
    ]
  };

  const [errCode, items] = await getMany(user, conditions, permissionsRequired, basicOnly, options);
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

async function getByUniverseShortname(user, shortname, permissionsRequired=perms.READ, basicOnly=false, options) {

  const conditions = { 
    strings: [
      'universe.shortname = ?',
    ], values: [
      shortname,
    ]
  };

  const [errCode, items] = await getMany(user, conditions, permissionsRequired, basicOnly, options);
  if (!items) return [errCode];
  return [200, items];
}

async function getByUniverseAndItemShortnames(user, universeShortname, itemShortname, permissionsRequired=perms.READ, basicOnly=false) {

  const conditions = { 
    strings: [
      'universe.shortname = ?',
      'item.shortname = ?',
    ], values: [
      universeShortname,
      itemShortname,
    ]
  };

  const [errCode, data] = await getMany(user, conditions, permissionsRequired, basicOnly);
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
  const { title, obj_data, tags } = changes;

  if (!title || !obj_data) return [400];
  const [code, item] = await getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE);
  if (!item) return [code];

  if (tags) {
    // If tags list is provided, we can just as well handle it here
    putTags(user, universeShortname, itemShortname, tags);
    const tagLookup = {};
    item.tags?.forEach(tag => {
      tagLookup[tag] = true;
    });
    tags.forEach(tag => {
      delete tagLookup[tag];
    });
    delTags(user, universeShortname, itemShortname, Object.keys(tagLookup));
  }

  try {
    return [200, await executeQuery(`UPDATE item SET ? WHERE id = ${item.id};`, { title, obj_data, updated_at: new Date(), last_updated_by: user.id })];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

// TODO - how should permissions work on this?
async function exists(universeShortname, itemShortname) {
  const queryString = `
    SELECT 1
    FROM item
    INNER JOIN universe ON universe.id = item.universe_id
    WHERE universe.shortname = ? AND item.shortname = ?;
  `;
  const data = await executeQuery(queryString, [universeShortname, itemShortname]);
  return data.length > 0;
}


/**
 * NOT safe. Make sure user has permissions to the item in question before calling this!
 * @param {*} itemShortname 
 * @returns 
 */
async function putLineage(parent_id, child_id, parent_title, child_title) {
  const queryString = `INSERT INTO lineage SET ?;`;
  const data = await executeQuery(queryString, { parent_id, child_id, parent_title, child_title });
  return [200, data];
}


/**
 * NOT safe. Make sure user has permissions to the item in question before calling this!
 * @param {*} itemShortname 
 * @returns 
 */
async function delLineage(parent_id, child_id) {
  const queryString = `DELETE FROM lineage WHERE parent_id = ? AND child_id = ?;`;
  const data = await executeQuery(queryString, [ parent_id, child_id, ]);
  return [200, data];
}

async function putTags(user, universeShortname, itemShortname, tags) {
  if (!tags || tags.length === 0) return [400];
  const [code, item] = await getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE, true);
  if (!item) return [code];
  try {
    const tagLookup = {};
    item.tags?.forEach(tag => {
      tagLookup[tag] = true;
    });
    const valueString = tags.filter(tag => !tagLookup[tag]).map(tag => `(${item.id}, "${tag}")`).join(',');
    if (!valueString) return [200];
    const queryString = `INSERT INTO tag (item_id, tag) VALUES ${valueString};`;
    const data = await executeQuery(queryString);
    return [201, data];
  } catch (e) {
    console.error(e);
    return [500];
  }
}

async function delTags(user, universeShortname, itemShortname, tags) {
  if (!tags || tags.length === 0) return [400];
  const [code, item] = await getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE, true);
  if (!item) return [code];
  try {
    const whereString = tags.map(tag => `tag = "${tag}"`).join(' OR ');
    if (!whereString) return [200];
    const queryString = `DELETE FROM tag WHERE item_id = ${item.id} AND (${whereString});`;
    const data = await executeQuery(queryString);
    return [200, data];
  } catch (e) {
    console.error(e);
    return [500];
  }
}

async function snoozeUntil(user, universeShortname, itemShortname) {
  const [code, item] = await getByUniverseAndItemShortnames(user, universeShortname, itemShortname, perms.WRITE);
  if (!item) return [code];

  const snooze = (await executeQuery(`SELECT * FROM snooze WHERE item_id = ${item.id} AND snoozed_by = ${user.id};`))[0];

  const now = new Date();
  const snoozeTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  try {
    if (snooze) {
      return [200, await executeQuery(`UPDATE snooze SET ? WHERE item_id = ${item.id} AND snoozed_by = ${user.id};`, { snoozed_until: snoozeTime })];
    } else {
      return [200, await executeQuery(`INSERT INTO snooze (item_id, snoozed_until, snoozed_by) VALUES (?, ?, ?);`, [item.id, snoozeTime, user.id])];
    }
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getOne,
  getMany,
  getByAuthorUsername,
  getByUniverseId,
  getByUniverseAndItemIds,
  getByUniverseShortname,
  getByUniverseAndItemShortnames,
  post,
  put,
  exists,
  putLineage,
  delLineage,
  putTags,
  delTags,
  snoozeUntil,
};