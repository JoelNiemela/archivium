const db = require('.');
const _ = require('lodash');

exports.executeQuery = (query, values) => {
  return db.queryAsync(query, values).spread(results => results);
};

exports.parseData = (options) => {
  return _.reduce(options, (parsed, value, key) => {
    parsed.string.push(`${key} = ?`);
    parsed.values.push(value);
    return parsed;
  }, { string: [], values: [] });
};