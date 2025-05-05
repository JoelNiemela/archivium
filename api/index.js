const contact = require('./models/contact');
const discussion = require('./models/discussion');
const email = require('./models/email');
const item = require('./models/item');
const note = require('./models/note');
const notification = require('./models/notification');
const session = require('./models/session');
const universe = require('./models/universe');
const user = require('./models/user');

const api = {
  contact,
  discussion,
  email,
  item,
  note,
  notification,
  session,
  universe,
  user,
};

module.exports = api;
