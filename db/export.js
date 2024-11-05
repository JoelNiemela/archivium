const mysql = require('mysql2');
const dbConfig = require('./config');
const Promise = require('bluebird');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * Export contents of database to JSON for ETL purposes.
 */
async function dbExport(db) {
  const tables = (await db.queryAsync('SHOW TABLES;'))[0].map(item => item[`Tables_in_${dbConfig.database}`]);
  
  for (const table of tables) {
    console.log(table)
    if (table === 'session') continue;
    const types = {};
    const typeArray = (await db.queryAsync(`DESCRIBE ${table};`))[0].map(item => types[item.Field] = item.Type);
    // console.log(types)

    const itemArray = await db.queryAsync(`SELECT * FROM ${table};`);
    const items = {};
    itemArray[0].forEach((item, i) => {
      items[i] = item;
    });
    await fsPromises.writeFile(path.join(__dirname, `export/${table}.json`), JSON.stringify({
      types,
      items,
    }));
  }
};

async function main() {
  const connection = mysql.createConnection({ ...dbConfig, multipleStatements: true });
  const db = Promise.promisifyAll(connection, { multiArgs: true });
  await dbExport(db);
  db.end();
}

if (require.main === module) {
  main();
}

module.exports = dbExport;
