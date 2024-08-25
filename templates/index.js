const pug = require('pug');
const { ADDR_PREFIX } = require('../config');
const { perms } = require('../api/utils');
const path = require('path');

const locale = {
  en: {
    article: 'article',
    'article-pl': 'articles',
    character: 'character',
    'character-pl': 'characters',
    location: 'location',
    'location-pl': 'locations',
    event: 'event',
    'event-pl': 'events',
    archive: 'archive',
    'archive-pl': 'archives',
    article: 'articles',
    'article-pl': 'articles',
    document: 'document',
    'document-pl': 'documents',
    timeline: 'timeline',
    'timeline-pl': 'timelines',
    item: 'item',
    'item-pl': 'item',
    organization: 'organization',
    'organization-pl': 'organization',
  }
};

// Basic context information to be sent to the templates
function contextData(req) {
  const user = req.session.user;
  const contextUser = user ? { id: user.id, username: user.username } : null;
  const lang = 'en';

  function T(str) {
    return locale[lang][str] ?? str;
  }

  return {
    contextUser,
    ADDR_PREFIX,
    perms,
    T,
  };
}

const pugOptions = {
  basedir: path.join(__dirname, '..'),
};

function compile(file) {
  return pug.compileFile(file, pugOptions);
}

// compile templates
const templates = {
  error: compile('templates/error.pug'),
  home: compile('templates/home.pug'),
  login: compile('templates/login.pug'),
  signup: compile('templates/signup.pug'),

  universe: compile('templates/view/universe.pug'),
  editUniverse: compile('templates/edit/universe.pug'),
  universeList: compile('templates/list/universes.pug'),
  createUniverse: compile('templates/create/universe.pug'),
  editUniversePerms: compile('templates/edit/universePerms.pug'),

  item: compile('templates/view/item.pug'),
  editItem: compile('templates/edit/item.pug'),
  itemList: compile('templates/list/items.pug'),
  createItem: compile('templates/create/item.pug'),

  universeItemList: compile('templates/list/universeItems.pug'),

  user: compile('templates/view/user.pug'),
  userList: compile('templates/list/users.pug'),
};

function render(req, template, context = {}) {
  if (template in templates) return templates[template]({ ...context, ...contextData(req) });
  else return templates.error({
    code: 404,
    hint: `Template ${template} not found.`,
    ...contextData(req)
  });
}

module.exports = {
  render,
};