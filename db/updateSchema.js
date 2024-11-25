const mysql = require('mysql2');
const dbConfig = require('./config');
const Promise = require('bluebird');
const { loadSchema } = require('./import');

async function main() {
  const connection = mysql.createConnection({ ...dbConfig, multipleStatements: true });
  const db = Promise.promisifyAll(connection, { multiArgs: true });
  await loadSchema(db);
  db.end();
}
if (require.main === module) {
  main();
}
