const fs = require('fs');
const join = require('path').join;

const api = {};
const models = join(__dirname, 'models');

fs.readdirSync(models)
  .filter(file => ~file.indexOf('.js'))
  .forEach(file => {
    api[file.substring(0, file.length - 3)] = require(join(models, file))
  });

module.exports = api;
