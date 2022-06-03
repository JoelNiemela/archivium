const mongoose = require('mongoose');
const { itemSchema } = require('./schemas');

const Item = mongoose.model('Item', itemSchema);

module.exports = {
  Item
};