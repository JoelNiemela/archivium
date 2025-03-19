const { ADDR_PREFIX, DEV_MODE } = require('../config');
const Auth = require('../middleware/auth');
const api = require('../api');
const md5 = require('md5');
const { render } = require('../templates');
const { perms, Cond, getPfpUrl } = require('../api/utils');
const fs = require('fs/promises');
const logger = require('../logger');

const pages = require('./pages');
const forms = require('./forms');

module.exports = function(app) {
  app.use((req, res, next) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.prepareRender = (template, data={}) => {
      res.templateData = [template, data];
    };
    next();
  })

  const doRender = (req, res, next) => {
    if (res.statusCode === 302) return next(); // We did a redirect, no need to render.
    try {
      const [template, data] = res.templateData;
      res.end(render(req, template, data));
    } catch (err) {
      logger.error(`Error ${res.statusCode} rendered.`);
      logger.error(err);
      res.end(render(req, 'error', { code: res.statusCode }));
    }
    next();
  };

  function use(method, path, ...middleware) {
    const handler = middleware.pop();
    if (!(['get', 'post', 'put'].includes(method))) throw `Illegal method: ${method}`;
    app[method](`${ADDR_PREFIX}${path}`, ...middleware, async (req, res, next) => {
      await handler(req, res);
      next();
    }, doRender);
  }
  const get = (...args) => use('get', ...args);
  const post = (...args) => use('post', ...args);
  const put = (...args) => use('put', ...args);

  // TEMPORARY redirect
  get('/help/markdown', async (_, res) => {
    res.redirect('https://github.com/JoelNiemela/archivium/wiki/Markdown-Guide');
  });

  get('/', pages.home);

  /* Terms and Agreements */
  get('/privacy-policy', pages.misc.privacyPolicy);
  get('/terms-of-service', pages.misc.termsOfService);
  get('/code-of-conduct', pages.misc.codeOfConduct);

  /* Help Pages */
  get('/markdown-demo', pages.misc.markdownDemo);

  /* User Pages */
  get('/contacts', Auth.verifySessionOrRedirect, pages.user.contactList);
  get('/users/:username', pages.user.profilePage);
  get('/settings', Auth.verifySessionOrRedirect, pages.user.settings);
  post('/settings/notifications', Auth.verifySessionOrRedirect, forms.notificationSettings);
  get('/verify', pages.user.requestVerify);
  get('/verify/:key', pages.user.verifyUser);
  get('/notifications', pages.user.notifications);

  /* Universe Pages */
  get('/universes', pages.universe.list);
  get('/universes/create', Auth.verifySessionOrRedirect, pages.universe.create);
  post('/universes/create', Auth.verifySessionOrRedirect, forms.createUniverse);
  get('/universes/:shortname', pages.universe.view);
  get('/universes/:shortname/delete', Auth.verifySessionOrRedirect, pages.universe.delete);
  get('/universes/:shortname/edit', Auth.verifySessionOrRedirect, pages.universe.edit);
  post('/universes/:shortname/edit', Auth.verifySessionOrRedirect, forms.editUniverse);
  get('/universes/:shortname/discuss/create', Auth.verifySessionOrRedirect, pages.universe.createDiscussionThread);
  post('/universes/:shortname/discuss/create', Auth.verifySessionOrRedirect, forms.createUniverseThread);
  get('/universes/:shortname/discuss/:threadId', pages.universe.discussionThread);
  post('/universes/:shortname/discuss/:threadId/comment', Auth.verifySessionOrRedirect, forms.commentOnThread);
  get('/universes/:shortname/items', pages.universe.itemList);
  get('/universes/:shortname/permissions', Auth.verifySessionOrRedirect, pages.universe.editPerms);
  post('/universes/:shortname/permissions', Auth.verifySessionOrRedirect, forms.editUniversePerms);

  /* Item Pages */
  get('/items', pages.item.list);
  get('/universes/:shortname/items/create', Auth.verifySessionOrRedirect, pages.item.create);
  post('/universes/:shortname/items/create', Auth.verifySessionOrRedirect, forms.createItem);
  get('/universes/:universeShortname/items/:itemShortname', pages.item.view);
  get('/universes/:universeShortname/items/:itemShortname/edit', Auth.verifySessionOrRedirect, pages.item.edit);
  post('/universes/:universeShortname/items/:itemShortname/edit', Auth.verifySessionOrRedirect, forms.editItem);

  /* Note pages */
  get('/notes', Auth.verifySessionOrRedirect, pages.misc.notes);
  post('/notes/create', Auth.verifySessionOrRedirect, forms.createNote);
  post('/notes/edit', Auth.verifySessionOrRedirect, forms.editNote);

  /* Misc pages */
  get('/search', pages.misc.search);
}
