const mysql = require('mysql2');
const { DB_CONFIG } = require('../config');
const Promise = require('bluebird');
const logger = require('../logger');

const connection = mysql.createConnection({ ...DB_CONFIG });

const db = Promise.promisifyAll(connection, { multiArgs: true });

db.connectPromise = db.connectAsync()
  .then(() => {
    logger.info(`Connected to ${DB_CONFIG.database} database as ID ${db.threadId}`);
  });

module.exports = db;
