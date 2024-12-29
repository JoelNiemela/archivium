const mysql = require('mysql2');
const { DB_CONFIG } = require('../config');
const Promise = require('bluebird');
const { loadSchema } = require('./import');

async function main() {
  const connection = mysql.createConnection({ ...DB_CONFIG, multipleStatements: true });
  const db = Promise.promisifyAll(connection, { multiArgs: true });
  await loadSchema(db);
  db.end();
}
if (require.main === module) {
  main();
}
