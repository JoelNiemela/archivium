const mongoose = require('mongoose');
const { universeSchema } = require('./schemas');

const Universe = mongoose.model('Universe', universeSchema);

module.exports = {
  Universe
};