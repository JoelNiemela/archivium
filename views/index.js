const { ADDR_PREFIX, DEV_MODE } = require('../config');
const Auth = require('../middleware/auth');
const api = require('../api');
const md5 = require('md5');
const { render } = require('../templates');
const { perms, Cond, getPfpUrl } = require('../api/utils');
const fs = require('fs/promises');
const logger = require('../logger');
const ReCaptcha = require('../middleware/reCaptcha');

const pages = require('./pages');
const forms = require('./forms');

const sites = {
  DISPLAY: (req) => !!req.headers['x-subdomain'],
  NORMAL: (req) => !req.headers['x-subdomain'],
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
    if (res.statusCode === 401) { // We don't have permission to be here, redirect to login page.
      const searchQueries = new URLSearchParams(req.query);
      const pageQuery = new URLSearchParams();
      pageQuery.append('page', req.path);
      if (searchQueries.toString()) pageQuery.append('search', searchQueries.toString());
      return res.redirect(`${ADDR_PREFIX}/login?${pageQuery.toString()}`);;
    }
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

  const subdomain = (page, params) => {
    return async (req, res) => {
      req.params = { ...req.params, ...params(req.headers['x-subdomain']) };
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
  get('/notifications', sites.ALL, Auth.verifySessionOrRedirect, pages.user.notifications);
  get('/forgot-password', sites.ALL, (_, res) => res.prepareRender('forgotPassword'));
  post('/forgot-password', sites.ALL, ReCaptcha.verifyReCaptcha, forms.passwordResetRequest);
  get('/reset-password/:key', sites.ALL,  (_, res) => res.prepareRender('resetPassword'));
  post('/reset-password/:key', sites.ALL, forms.resetPassword);

  /* Misc pages */
  get('/search', sites.ALL, pages.misc.search);

  /* Note pages */
  get('/notes', sites.ALL, Auth.verifySessionOrRedirect, pages.misc.notes);
  post('/notes/create', sites.ALL, Auth.verifySessionOrRedirect, forms.createNote);
  post('/notes/edit', sites.ALL, Auth.verifySessionOrRedirect, forms.editNote);

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
  post('/universes/:universeShortname/items/:itemShortname/comment', sites.NORMAL, Auth.verifySessionOrRedirect, forms.commentOnItem);

  /* Display Mode Pages */
  get('/', sites.DISPLAY, subdomain(pages.universe.view, (sub) => ({ shortname: sub })));
  get('/delete', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.universe.delete, (sub) => ({ shortname: sub })));
  get('/edit', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.universe.edit, (sub) => ({ shortname: sub })));
  post('/edit', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.editUniverse, (sub) => ({ shortname: sub })));
  get('/discuss/create', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.universe.createDiscussionThread, (sub) => ({ shortname: sub })));
  post('/discuss/create', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.createUniverseThread, (sub) => ({ shortname: sub })));
  get('/discuss/:threadId', sites.DISPLAY, subdomain(pages.universe.discussionThread, (sub) => ({ shortname: sub })));
  post('/discuss/:threadId/comment', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.commentOnThread, (sub) => ({ shortname: sub })));
  get('/permissions', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.universe.editPerms, (sub) => ({ shortname: sub })));
  post('/permissions', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.editUniversePerms, (sub) => ({ shortname: sub })));
  
  get('/items', sites.DISPLAY, subdomain(pages.universe.itemList, (sub) => ({ shortname: sub })));
  get('/items/create', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.item.create, (sub) => ({ shortname: sub })));
  post('/items/create', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.createItem, (sub) => ({ shortname: sub })));
  get('/items/:itemShortname', sites.DISPLAY, subdomain(pages.item.view, (sub) => ({ universeShortname: sub })));
  get('/items/:itemShortname/edit', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(pages.item.edit, (sub) => ({ universeShortname: sub })));
  post('/items/:itemShortname/edit', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.editItem, (sub) => ({ universeShortname: sub })));
  post('/items/:itemShortname/comment', sites.DISPLAY, Auth.verifySessionOrRedirect, subdomain(forms.commentOnItem, (sub) => ({ universeShortname: sub })));
}
