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
  await api.item.save(owner, universe.shortname, shortname, { title, tags, obj_data }, true);
  const [, item] = await api.item.getOne(owner, { 'item.id' : data.insertId });
  return item;
}

async function setFollowingUniverse(follower, universe, isFollowing=true) {
  await api.universe.putUserFollowing(follower, universe.shortname, isFollowing);
}

async function createDiscussionThread(poster, universe, title) {
  const [, data] = await api.discussion.postUniverseThread(poster, universe.shortname, { title });
  const [, threads] = await api.discussion.getThreads(poster, { 'discussion.id': data.insertId });
  return threads[0];
}

async function postComment(poster, thread, comment) {
  await api.discussion.postCommentToThread(poster, thread.id, { body: comment });
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
  const privateUniverse = await createUniverse(users.testadmin, 'Private Test Universe', 'private-test-universe', false, true);
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
  const testTimeline = await createItem(users.testwriter, publicUniverse, 'Test Timeline', 'test-timeline', 'timeline', defaultItemData.timeline([
    testEvent, testCharacter, testParent, testChild,
  ]));

  console.log('Following universes...');
  await setFollowingUniverse(users.testadmin, publicUniverse);
  await setFollowingUniverse(users.testadmin, privateUniverse);
  await setFollowingUniverse(users.testadmin, chatroomUniverse);

  console.log('Creating threads...');
  const privateThread = await createDiscussionThread(users.testcommenter, privateUniverse, 'Private Test Thread');
  const chatroomThread = await createDiscussionThread(users.testcommenter, chatroomUniverse, 'Chatroom Thread');

  console.log('Posting comments...');
  await postComment(users.testcommenter, privateThread, 'Test question?');
  await postComment(users.testadmin, privateThread, 'Test answer.');
  await postComment(users.testuser, chatroomThread, 'Hello world!');
  await postComment(users.testreader, chatroomThread, `
    Lorem ipsum odor amet, consectetuer adipiscing elit.Eleifend pellentesque eu; ipsum hendrerit facilisis luctus mauris netus.
    Varius curabitur amet vel donec sed nullam. Vestibulum eget facilisi conubia montes scelerisque curae augue odio.
    Facilisi elit velit erat nunc sem eu finibus finibus. Rutrum nec aliquet est montes laoreet fusce egestas.
    Habitasse velit nec aenean aliquam mi dictum. Donec faucibus aliquam duis viverra amet lacus sit penatibus.
  `);
  await postComment(users.testcommenter, chatroomThread, 'Test comment.');
  await postComment(users.testwriter, chatroomThread, '# Markdown test\n- **bold**\n- *italics*\n- etc.');

  schemaConn.end();
  db.end();
}
if (require.main === module) {
  main();
}
