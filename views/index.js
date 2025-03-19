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

const sites = {
  DISPLAY: (req) => req.headers['x-subdomain'] !== '',
  NORMAL: (req) => req.headers['x-subdomain'] === '',
  ALL: () => true,
};

module.exports = function(app) {
  app.use((req, res, next) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.prepareRender = (template, data={}) => {
      res.templateData = [template, data];
    };
    next();
  })

  const doRender = async (req, res) => {
    if (res.statusCode === 302) return; // We did a redirect, no need to render.
    try {
      if (!res.templateData) throw `Code ${res.statusCode} returned by page handler.`;
      const [template, data] = res.templateData;
      res.end(render(req, template, data));
    } catch (err) {
      logger.error(`Error ${res.statusCode} rendered.`);
      logger.error(err);
      res.end(render(req, 'error', { code: res.statusCode }));
    }
  };

  function use(method, path, site, ...middleware) {
    const handler = middleware.pop();
    if (!(['get', 'post', 'put'].includes(method))) throw `Illegal method: ${method}`;
    app[method](`${ADDR_PREFIX}${path}`, ...middleware, async (req, res, next) => {
      if (site(req)) {
        await handler(req, res);
        await doRender(req, res);
      }
      next();
    });
  }
  const get = (...args) => use('get', ...args);
  const post = (...args) => use('post', ...args);
  const put = (...args) => use('put', ...args);

  const params = (page, params) => {
    return async (req, res) => {
      req.params = { ...req.params, ...params(req) };
      await page(req, res);
    };
  };

  // TEMPORARY redirect
  get('/help/markdown', async (_, res) => {
    res.redirect('https://github.com/JoelNiemela/archivium/wiki/Markdown-Guide');
  });

  get('/', sites.NORMAL, pages.home);

  /* Terms and Agreements */
  get('/privacy-policy', sites.ALL, pages.misc.privacyPolicy);
  get('/terms-of-service', sites.ALL, pages.misc.termsOfService);
  get('/code-of-conduct', sites.ALL, pages.misc.codeOfConduct);

  /* Help Pages */
  get('/markdown-demo', sites.ALL, pages.misc.markdownDemo);

  /* User Pages */
  get('/contacts', sites.ALL, Auth.verifySessionOrRedirect, pages.user.contactList);
  get('/users/:username', sites.ALL, pages.user.profilePage);
  get('/settings', sites.ALL, Auth.verifySessionOrRedirect, pages.user.settings);
  post('/settings/notifications', sites.ALL, Auth.verifySessionOrRedirect, forms.notificationSettings);
  get('/verify', sites.ALL, pages.user.requestVerify);
  get('/verify/:key', sites.ALL, pages.user.verifyUser);
  get('/notifications', sites.ALL, pages.user.notifications);

  /* Misc pages */
  get('/search', sites.ALL, pages.misc.search);

  /* Universe Pages */
  get('/universes', sites.NORMAL, pages.universe.list);
  get('/universes/create', sites.NORMAL, Auth.verifySessionOrRedirect, pages.universe.create);
  post('/universes/create', sites.NORMAL, Auth.verifySessionOrRedirect, forms.createUniverse);
  get('/universes/:shortname', sites.NORMAL, pages.universe.view);
  get('/universes/:shortname/delete', sites.NORMAL, Auth.verifySessionOrRedirect, pages.universe.delete);
  get('/universes/:shortname/edit', sites.NORMAL, Auth.verifySessionOrRedirect, pages.universe.edit);
  post('/universes/:shortname/edit', sites.NORMAL, Auth.verifySessionOrRedirect, forms.editUniverse);
  get('/universes/:shortname/discuss/create', sites.NORMAL, Auth.verifySessionOrRedirect, pages.universe.createDiscussionThread);
  post('/universes/:shortname/discuss/create', sites.NORMAL, Auth.verifySessionOrRedirect, forms.createUniverseThread);
  get('/universes/:shortname/discuss/:threadId', sites.NORMAL, pages.universe.discussionThread);
  post('/universes/:shortname/discuss/:threadId/comment', sites.NORMAL, Auth.verifySessionOrRedirect, forms.commentOnThread);
  get('/universes/:shortname/items', sites.NORMAL, pages.universe.itemList);
  get('/universes/:shortname/permissions', sites.NORMAL, Auth.verifySessionOrRedirect, pages.universe.editPerms);
  post('/universes/:shortname/permissions', sites.NORMAL, Auth.verifySessionOrRedirect, forms.editUniversePerms);

  /* Item Pages */
  get('/items', sites.NORMAL, pages.item.list);
  get('/universes/:shortname/items/create', sites.NORMAL, Auth.verifySessionOrRedirect, pages.item.create);
  post('/universes/:shortname/items/create', sites.NORMAL, Auth.verifySessionOrRedirect, forms.createItem);
  get('/universes/:universeShortname/items/:itemShortname', sites.NORMAL, pages.item.view);
  get('/universes/:universeShortname/items/:itemShortname/edit', sites.NORMAL, Auth.verifySessionOrRedirect, pages.item.edit);
  post('/universes/:universeShortname/items/:itemShortname/edit', sites.NORMAL, Auth.verifySessionOrRedirect, forms.editItem);

  /* Note pages */
  get('/notes', sites.NORMAL, Auth.verifySessionOrRedirect, pages.misc.notes);
  post('/notes/create', sites.NORMAL, Auth.verifySessionOrRedirect, forms.createNote);
  post('/notes/edit', sites.NORMAL, Auth.verifySessionOrRedirect, forms.editNote);

  /* Display Mode Pages */
  get('/', sites.DISPLAY, params(pages.universe.view, (req) => ({ shortname: req.headers['x-subdomain'] })));
  get('/items', sites.DISPLAY, params(pages.universe.itemList, (req) => ({ shortname: req.headers['x-subdomain'] })));
  get('/items/:itemShortname', sites.DISPLAY, params(pages.item.view, (req) => ({ universeShortname: req.headers['x-subdomain'] })));
}
