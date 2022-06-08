const db = require('../database');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * **Replaces** contents of database with JSON data loaded from file.
 * 
 * This resets the **entire** database. Use with caution.
 */
async function dbImport() {
  // drop old database and reload the schema
  const schema = await fsPromises.readFile(path.join(__dirname, 'schema.sql'), { encoding: 'utf8' });
  await db.queryAsync(schema);

  // sessions are not restored

  // users
  const users = JSON.parse(await fsPromises.readFile(path.join(__dirname, 'export/users.json'), { encoding: 'utf8' }));
  for (const id in users) {
    const { username, email, password, salt, createdAt, updatedAt, permissionLevel } = users[id];
    await db.queryAsync(
      'INSERT INTO users (id, username, email, password, salt, createdAt, updatedAt, permissionLevel) VALUES (?,?,?,?,?,?,?,?);',
      [id, username, email, password, salt, new Date(createdAt), new Date(updatedAt), permissionLevel || 0]
    );
  }

  // universes
  const universes = JSON.parse(await fsPromises.readFile(path.join(__dirname, 'export/universes.json'), { encoding: 'utf8' }));
  for (const id in universes) {
    const { title, authorId, createdAt, updatedAt, public, objData } = universes[id];
    await db.queryAsync(
      'INSERT INTO universes (id, title, authorId, createdAt, updatedAt, public, objData) VALUES (?,?,?,?,?,?,?);',
      [id, title, authorId, new Date(createdAt), new Date(updatedAt), public, JSON.stringify(objData)]
    );
  }

  // items
  const items = JSON.parse(await fsPromises.readFile(path.join(__dirname, 'export/items.json'), { encoding: 'utf8' }));
  for (const id in items) {
    const { title, authorId, universeId, parentId, createdAt, updatedAt, objData } = items[id];
    await db.queryAsync(
      'INSERT INTO items (id, title, authorId, universeId, parentId, createdAt, updatedAt, objData) VALUES (?,?,?,?,?,?,?,?);',
      [id, title, authorId, universeId, parentId, new Date(createdAt), new Date(updatedAt), JSON.stringify(objData)]
    );
  }

  // items
  const authoruniverses = JSON.parse(await fsPromises.readFile(path.join(__dirname, 'export/authoruniverses.json'), { encoding: 'utf8' }));
  for (const id in authoruniverses) {
    const { universeId, userId, permissionLevel } = authoruniverses[id];
    await db.queryAsync(
      'INSERT INTO authoruniverses (id, universeId, userId, permissionLevel) VALUES (?,?,?,?);',
      [id, universeId, userId, permissionLevel]
    );
  }
};

async function main() {
  await dbImport();
  db.end();
}

if (require.main === module) {
  main();
}

module.exports = dbImport;