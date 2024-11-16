const mysql = require('mysql2');
const dbConfig = require('./config');
const Promise = require('bluebird');
const logger = require('../logger');

const connection = mysql.createConnection({ ...dbConfig });

const db = Promise.promisifyAll(connection, { multiArgs: true });

db.connectAsync()
  .then(() => {
    logger.info(`Connected to ${dbConfig.database} database as ID ${db.threadId}`);
  });

module.exports = db;
