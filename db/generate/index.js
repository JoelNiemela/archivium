const mysql = require('mysql2');
const dbConfig = require('../config');
const Promise = require('bluebird');
const { loadSchema, askQuestion } = require('../import');
const api = require('../../api');
const { perms } = require('../../api/utils');
const db = require('..');
const { defaultUniverseData, defaultItemData } = require('./defaults');

async function createUser(username, email, password) {
  if (!email) email = `${username}@archivium.net`;
  if (!password) password = username;
  const data = await api.user.post({ username, email, password });
  const [_, user] = await api.user.getOne({ id: data.insertId });
  return user;
}

async function createContact(requester, target, accept=true) {
  await api.contact.post(requester, target.username);
  if (accept) {
    await api.contact.put(requester, target.username, true);
  }
}

async function createUniverse(owner, title, shortname, public=true, discussion_enabled=false, discussion_open=false) {
  const [, data] = await api.universe.post(owner, { title, shortname, public, discussion_enabled, discussion_open, obj_data: defaultUniverseData });
  const [, universe] = await api.universe.getOne(owner, { 'universe.id': data[0].insertId });
  return universe;
}

async function setUniversePerms(owner, universe, user, permsLvl) {
  await api.universe.putPermissions(owner, universe.shortname, user, permsLvl);
}

async function createItem(owner, universe, title, shortname, item_type, obj_data, tags=['testing'], parent_id=null) {
  const [, data] = await api.item.post(owner, { title, shortname, item_type, parent_id, obj_data: {} }, universe.shortname);
  const [, item] = await api.item.getOne(owner, { 'item.id' : data.insertId });
  await api.item.save(owner, universe.shortname, item.shortname, { title, tags, obj_data }, true);
  return item;
}

async function main() {
  await db.connectPromise;

  const connection = mysql.createConnection({ ...dbConfig, multipleStatements: true });
  const schemaConn = Promise.promisifyAll(connection, { multiArgs: true });
  await loadSchema(schemaConn);

  console.log('Generating testing database...');

  console.log('Creating users...');
  const users = {};
  for (const user of ['user', 'admin', 'writer', 'commenter', 'reader']) {
    const username = `test${user}`;
    users[username] = await createUser(username);
  }
  
  console.log('Creating contacts...');
  await createContact(users.testadmin, users.testuser, false);
  await createContact(users.testadmin, users.testwriter);
  await createContact(users.testadmin, users.testcommenter);
  await createContact(users.testadmin, users.testreader);
  
  console.log('Creating universes...');
  const publicUniverse = await createUniverse(users.testadmin, 'Public Test Universe', 'public-test-universe', true);
  const privateUniverse = await createUniverse(users.testadmin, 'Private Test Universe', 'private-test-universe', false);
  const chatroomUniverse = await createUniverse(users.testadmin, 'Chatroom', 'chatroom', true, true, true);

  console.log('Setting permissions...');
  await setUniversePerms(users.testadmin, publicUniverse, users.testwriter, perms.WRITE);
  await setUniversePerms(users.testadmin, privateUniverse, users.testwriter, perms.WRITE);
  await setUniversePerms(users.testadmin, privateUniverse, users.testcommenter, perms.COMMENT);
  await setUniversePerms(users.testadmin, privateUniverse, users.testreader, perms.READ);
  await setUniversePerms(users.testadmin, chatroomUniverse, users.testuser, perms.ADMIN);

  console.log('Creating items...');
  const testArticle = await createItem(users.testwriter, publicUniverse, 'Test Article', 'test-article', 'article', defaultItemData.article);
  const testParent = await createItem(users.testwriter, publicUniverse, 'Test Parent', 'test-parent', 'character', defaultItemData.character(1));
  const testChild = await createItem(users.testwriter, publicUniverse, 'Test Child', 'test-child', 'character', defaultItemData.character(47));
  const testCharacter = await createItem(
    users.testwriter,
    publicUniverse,
    'Test Character',
    'test-character',
    'character',
    defaultItemData.character(25, testParent, testChild),
  );
  const testEvent = await createItem(users.testwriter, publicUniverse, 'Test Event', 'test-event', 'event', defaultItemData.event);

  schemaConn.end();
  db.end();
}
if (require.main === module) {
  main();
}
