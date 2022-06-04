const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/archivium');

const { Item } = require('./models');

const addItem = (itemObj) => {
  
};