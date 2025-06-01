const contact = require('./models/contact');
const discussion = require('./models/discussion');
const email = require('./models/email');
const item = require('./models/item');
const newsletter = require('./models/newsletter');
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
  newsletter,
  note,
  notification,
  session,
  universe,
  user,
};

contact.setApi(api);
discussion.setApi(api);
email.setApi(api);
item.setApi(api);
newsletter.setApi(api);
note.setApi(api);
notification.setApi(api);
session.setApi(api);
universe.setApi(api);
user.setApi(api);

module.exports = api;
