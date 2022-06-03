const mysql = require('mysql2');
const { PASSWORD, DATABASE } = require('./config');
const Promise = require('bluebird');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: PASSWORD,
  database: DATABASE,
});

const db = Promise.promisifyAll(connection, { multiArgs: true });

db.connectAsync()
  .then(() => {
    console.log(`Connected to ${DATABASE} database as ID ${db.threadId}`);
  });

module.exports = db;
