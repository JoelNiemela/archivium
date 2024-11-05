const db = require('.');
const fsPromises = require('fs').promises;
const path = require('path');
const dbConfig = require('./config');

/**
 * Back up contents of database to JSON in case the database is lost.
 */
async function backup() {
  console.log('Backing up db...');

  const tables = (await db.queryAsync('SHOW TABLES;'))[0].map(item => item[`Tables_in_${dbConfig.database}`]);
  const blob = {};
  for (const table of tables) {
    if (table === 'session') continue;
    const types = {};
    (await db.queryAsync(`DESCRIBE ${table};`))[0].map(item => types[item.Field] = item.Type);

    const itemArray = await db.queryAsync(`SELECT * FROM ${table};`);
    const items = {};
    itemArray[0].forEach((item, i) => {
      items[i] = item;
    });
    blob[table] = { types, items };
  }

  const time = Number(new Date());
  await fsPromises.writeFile(path.join(__dirname, `backups/backup-${time}.json`), JSON.stringify(blob));
  console.log('Backup complete.');
};

async function main() {
  await backup();
  db.end();
}

if (require.main === module) {
  main();
}

module.exports = backup;