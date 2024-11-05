const mysql = require('mysql2');
const dbConfig = require('./config');
const Promise = require('bluebird');
const { askQuestion, loadSchema, dbImport } = require('./import');

async function main() {
  const connection = mysql.createConnection({ ...dbConfig, multipleStatements: true });
  const db = Promise.promisifyAll(connection, { multiArgs: true });
  await loadSchema(db);
  const ans = await askQuestion(`Re-import DB from backup? [y/N] `);
  if (ans.toUpperCase() === 'Y') await dbImport(db, false);
  db.end();
}
if (require.main === module) {
  main();
}
