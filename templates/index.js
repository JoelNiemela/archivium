const pug = require('pug');
const { ADDR_PREFIX } = require('../config');
const { perms } = require('../api/utils');
const md5 = require('md5');
const path = require('path');

const locale = {
  en: {
    article: 'article',
    articles: 'articles',
    character: 'character',
    characters: 'characters',
    location: 'location',
    locations: 'locations',
    event: 'event',
    events: 'events',
    archive: 'archive',
    archives: 'archives',
    document: 'document',
    documents: 'documents',
    timeline: 'timeline',
    timelines: 'timelines',
    item: 'item',
    items: 'items',
    organization: 'organization',
    organizations: 'organizations',
    missing_cat: 'Missing Category',
    [`perms_${perms.NONE}`]: 'None',
    [`perms_${perms.READ}`]: 'Read',
    [`perms_${perms.WRITE}`]: 'Write',
    [`perms_${perms.ADMIN}`]: 'Admin',
  }
};

// Basic context information to be sent to the templates
function contextData(req) {
  const user = req.session.user;
  const contextUser = user ? {
    id: user.id,
    username: user.username,
    gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
  } : null;

  const lang = 'en';

  function T(str) {
    return locale[lang][str] ?? str;
  }

  const searchQueries = new URLSearchParams(req.query);
  const pageQuery = new URLSearchParams();
  pageQuery.append('page', req.path)
  if (searchQueries.toString()) pageQuery.append('search', searchQueries.toString())

  return {
    contextUser,
    ADDR_PREFIX,
    encodedPath: pageQuery.toString(),
    searchQueries: searchQueries.toString(),
    perms,
    locale: locale[lang],
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
  deleteUniverse: compile('templates/delete/universe.pug'),
  universeList: compile('templates/list/universes.pug'),
  createUniverse: compile('templates/create/universe.pug'),
  editUniversePerms: compile('templates/edit/universePerms.pug'),

  item: compile('templates/view/item.pug'),
  editItem: compile('templates/edit/item.pug'),
  editItemRaw: compile('templates/edit/itemRaw.pug'),
  itemList: compile('templates/list/items.pug'),
  createItem: compile('templates/create/item.pug'),

  universeItemList: compile('templates/list/universeItems.pug'),

  user: compile('templates/view/user.pug'),
  contactList: compile('templates/list/contacts.pug'),

  search: compile('templates/list/search.pug'),
};

function render(req, template, context = {}) {
  if (template in templates) return templates[template]({ ...context, ...contextData(req), curTemplate: template });
  else return templates.error({
    code: 404,
    hint: `Template ${template} not found.`,
    ...contextData(req),
    curTemplate: template,
  });
}

module.exports = {
  render,
};