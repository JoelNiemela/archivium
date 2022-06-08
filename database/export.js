const db = require('../database');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * Export contents of database to JSON for ETL purposes.
 */
async function dbExport() {
  // sessions are not saved
  
  // users
  const userArray = await db.queryAsync('SELECT * FROM users;');
  const users = {};
  userArray[0].forEach(user => {
    const id = user.id;
    delete user.id;
    users[id] = user;
  });
  await fsPromises.writeFile(path.join(__dirname, 'export/users.json'), JSON.stringify(users));

  // universes
  const universeArray = await db.queryAsync('SELECT * FROM universes;');
  const universes = {};
  universeArray[0].forEach(universe => {
    const id = universe.id;
    delete universe.id;
    universe.objData = JSON.parse(universe.objData);
    universes[id] = universe;
  });
  await fsPromises.writeFile(path.join(__dirname, 'export/universes.json'), JSON.stringify(universes));

  // items
  const itemArray = await db.queryAsync('SELECT * FROM items;');
  const items = {};
  itemArray[0].forEach(item => {
    const id = item.id;
    delete item.id;
    item.objData = JSON.parse(item.objData);
    items[id] = item;
  });
  await fsPromises.writeFile(path.join(__dirname, 'export/items.json'), JSON.stringify(items));

  // authors-universes
  const authoruniverseArray = await db.queryAsync('SELECT * FROM authoruniverses;');
  const authoruniverses = {};
  authoruniverseArray[0].forEach(authoruniverse => {
    const id = authoruniverse.id;
    delete authoruniverse.id;
    authoruniverses[id] = authoruniverse;
  });
  await fsPromises.writeFile(path.join(__dirname, 'export/authoruniverses.json'), JSON.stringify(authoruniverses));
};

async function main() {
  await dbExport();
  db.end();
}

if (require.main === module) {
  main();
}

module.exports = dbExport;