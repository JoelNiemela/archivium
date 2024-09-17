const db = require('../db');
const fsPromises = require('fs').promises;
const path = require('path');

function formatTypes(type, data) {
  if (type === 'datetime' || type === 'date' || type === 'timestamp') {
    return data ? new Date(data) : null;
  } else {
    return data;
  }
}

/**
 * **Replaces** contents of database with JSON data loaded from file.
 * 
 * This resets the **entire** database. Use with caution.
 */
async function dbImport() {
  // drop old database and reload the schema
  const schema = await fsPromises.readFile(path.join(__dirname, 'schema.sql'), { encoding: 'utf8' });
  await db.queryAsync(schema);

  // disable constraint checking
  await db.queryAsync('SET FOREIGN_KEY_CHECKS = 0;');

  const tables = (await db.queryAsync('SHOW TABLES;'))[0].map(item => item['Tables_in_archivium']);
  
  for (const table of tables) {
    if (table === 'session') continue;
    try {
      const data = JSON.parse(await fsPromises.readFile(path.join(__dirname, `export/${table}.json`), { encoding: 'utf8' }));
      for (const id in data.items) {
        const keys = Object.keys(data.items[id]);
        for (const key of keys) {
          data.items[id][key] = formatTypes(data.types[key], data.items[id][key]);
        }
        await db.queryAsync(
          `INSERT INTO ${table} (${keys.join(',')}) VALUES (${'?'.repeat(keys.length).split('').join(',')});`,
          Object.values(data.items[id])
        );
      }
    } catch(err) {
      if (err.code === 'ENOENT') console.error(`Missing file ${table}.json, skipping.`)
      else console.error(err);
    }
  }

  // reenable constraint checking
  await db.queryAsync('SET FOREIGN_KEY_CHECKS = 1;');
};

async function main() {
  await dbImport();
  db.end();
}

if (require.main === module) {
  main();
}

module.exports = dbImport;