const db = require('../db');
const _ = require('lodash');

exports.executeQuery = (query, values) => {
  return db.queryAsync(query, values).spread(results => results);
};

exports.parseData = (options) => {
  return _.reduce(options, (parsed, value, key) => {
    parsed.strings.push(`${key} = ?`);
    parsed.values.push(value);
    return parsed;
  }, { strings: [], values: [] });
};