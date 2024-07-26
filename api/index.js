const fs = require('fs');
const join = require('path').join;

const api = {};

fs.readdirSync(__dirname)
  .filter(file => ~file.indexOf('.js') && file !== 'index.js')
  .forEach(file => {
    api[file.substring(0, file.length - 3)] = require(join(__dirname, file))
  });

module.exports = api;
