const { ADDR_PREFIX } = require('./config');
const Auth = require('./middleware/auth');
const api = require('./api');
const md5 = require('md5');
const { render } = require('./templates');
const { perms } = require('./api/utils');
const { parseMarkdown } = require('./templates/markdown');
const { user } = require('./db/config');

module.exports = function(app) {
  app.use((req, res, next) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.prepareRender = (template, data={}) => {
      res.templateData = [template, data];
    };
    next();
  })

  const doRender = (req, res) => {
    if (res.statusCode === 302) return; // We did a redirect, no need to render.
    try {
      const [template, data] = res.templateData;
      res.end(render(req, template, data));
    } catch (err) {
      console.error(`Error ${res.statusCode} rendered`);
      res.end(render(req, 'error', { code: res.statusCode }));
    }
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

  get(`${ADDR_PREFIX}/`, (_, res) => res.prepareRender('home'));

  /* User Pages */
  get('/users', Auth.verifySessionOrRedirect, async (_, res) => {
    const [code, users] = await api.user.getMany(undefined, true);
    res.status(code);
    if (!users) return;
    res.prepareRender('userList', {
      users: users.map(user => ({
        ...user,
        gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
      })),
    });
  });

  get('/users/:username', async (req, res) => {
    const [code1, user] = await api.user.getOne({ username: req.params.username });
    res.status(code1);
    if (!user) return;
    const [code2, universes] = await api.universe.getManyByAuthorId(req.session.user, user.id);
    res.status(code2);
    if (!universes) return;
    res.prepareRender('user', { 
      user,
      gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
      universes,
    });
  });

  /* Universe Pages */
  get('/universes', async (req, res) => {
    const [code, universes] = await api.universe.getMany(req.session.user);
    res.status(code);
    if (!universes) return;
    res.prepareRender('universeList', { universes });
  });
 
  get('/universes/create', async (_, res) => {
    res.prepareRender('createUniverse');
  });
  post('/universes/create', async (req, res) => {
    const [code, data] = await api.universe.post(req.session.user, {
      ...req.body,
      public: req.body.visibility === 'public',
    });
    res.status(code);
    if (code === 201) return res.redirect(`${ADDR_PREFIX}/universes/${req.body.shortname}`);
    res.prepareRender('createUniverse', { error: data, ...req.body });
  });
  
  get('/universes/:shortname', async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (!universe) return;
    res.prepareRender('universe', { universe });
  });

  get('/universes/:shortname/edit', async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.WRITE);
    res.status(code);
    if (!universe) return;
    res.prepareRender('editUniverse', { universe });
  });
  post('/universes/:shortname/edit', async (req, res) => {
    req.body = {
      ...req.body,
      public: req.body.visibility === 'public',
    }
    console.log(req.body)
    const [code, data] = await api.universe.put(req.session.user, req.params.shortname, req.body);
    res.status(code);
    if (code === 200) return res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}`);
    console.log(code, data)
    res.prepareRender('editUniverse', { error: data, ...req.body });
  });

  get('/universes/:shortname/items', async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, items] = await api.item.getByUniverseShortname(req.session.user, req.params.shortname, perms.READ, true, {
      sort: req.query.sort,
      sortDesc: req.query.sort_order === 'desc',
      limit: req.query.limit,
      type: req.query.type,
      tag: req.query.tag,
    });
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('universeItemList', { items, universe, type: req.query.type, tag: req.query.tag });
  });
 
  get('/universes/:shortname/items/create', async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('createItem', { universe, item_type: req.query.type, shortname: req.query.shortname });
  });
  post('/universes/:shortname/items/create', async (req, res) => {
    const [userCode, data] = await api.item.post(req.session.user, {
      ...req.body,
    }, req.params.shortname);
    res.status(userCode);
    if (userCode === 201) return res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}/items/${req.body.shortname}`);
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('createItem', { error: data, ...req.body, universe });
  });

  get('/universes/:universeShortname/items/:itemShortname', async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.universeShortname });
    const [code2, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname);
    res.status(code1);
    if (code1 !== 200) return;
    if (!item) {
      if (universe.author_permissions[req.session.user?.id] >= perms.READ) {
        res.prepareRender('error', {
          code: 404,
          hint: 'Looks like this item doesn\'t exist yet. Follow the link below to create it:',
          hintLink: `${ADDR_PREFIX}/universes/${req.params.universeShortname}/items/create?shortname=${req.params.itemShortname}`,
        });
      } else {
        res.status(code2);
      }
      return;
    }
    item.obj_data = JSON.parse(item.obj_data);
    const parsedBody = 'body' in item.obj_data && (await parseMarkdown(item.obj_data.body || '').evaluate(req.params.universeShortname, { item }))
    if ('tabs' in item.obj_data) {
      for (const tab in item.obj_data.tabs) {
        for (const key in item.obj_data.tabs[tab]) {
          item.obj_data.tabs[tab][key] = await parseMarkdown(item.obj_data.tabs[tab][key]).evaluate(
            req.params.universeShortname,
            null,
            (tag) => {
              if (tag.type === 'div') tag.attrs.style = {'text-align': 'right'};
              if (tag.type === 'p') tag.type = 'span';
            },
          );
        }
      }
    }
    if ('gallery' in item.obj_data) {
      item.obj_data.gallery.imgs = await Promise.all((item.obj_data.gallery.imgs ?? []).filter(img => img).map(
        async ({ url, label }) => {
          const parsedLabel = label && parseMarkdown(label);
          return { 
            url, 
            label: parsedLabel && parsedLabel.innerText(),
            mdLabel: parsedLabel && await parsedLabel.evaluate(
              req.params.universeShortname,
              null,
              (tag) => {
                if (tag.type === 'div') {
                  tag.attrs.style = {'text-align': 'center'};
                  tag.attrs.class += ' label';
                }
                if (tag.type === 'p') tag.type = 'span';
              },
            ),
          }
        }
      ));
    }
    res.prepareRender('item', { item, universe, parsedBody, tab: req.query.tab });
  });
  get('/universes/:universeShortname/items/:itemShortname/edit', async (req, res) => {
    const [code1, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname, perms.WRITE);
    const [code2, itemList] = await api.item.getByUniverseId(req.session.user, item.universe_id, perms.READ, true, { type: 'character' });
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return;
    item.obj_data = JSON.parse(item.obj_data);
    if (Object.keys(item.parents).length > 0 || Object.keys(item.children).length > 0) {
      item.obj_data.lineage = { ...item.obj_data.lineage };
      item.obj_data.lineage.parents = item.parents;
      item.obj_data.lineage.children = item.children;
    }
    const itemMap = {};
    itemList.forEach(item => itemMap[item.shortname] = item.title);
    res.prepareRender(req.query.mode === 'raw' ? 'editItemRaw' : 'editItem', { item, itemMap });
  });
  post('/universes/:universeShortname/items/:itemShortname/edit', async (req, res) => {
    // Handle tags
    req.body.tags = req.body.tags?.split(' ') ?? [];

    // Handle obj_data
    if (!('obj_data' in req.body)) {
      res.status(400);
      return; // We should probably render an error on the edit page instead here.
    }
    req.body.obj_data = JSON.parse(decodeURIComponent(req.body.obj_data));
    let lineage;
    if ('lineage' in req.body.obj_data) {
      lineage = req.body.obj_data.lineage;
      req.body.obj_data.lineage = { title: lineage.title };
    }
    let code; let data;
    req.body.obj_data = JSON.stringify(req.body.obj_data);

    // Actually save item
    [code, data] = await api.item.put(req.session.user, req.params.universeShortname, req.params.itemShortname, req.body);
    if (code !== 200) {
      res.status(code);
      return res.prepareRender('editItem', { error: data, ...req.body });
    }

    // Handle lineage data
    if (lineage) {
      let item;
      [code, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname, perms.WRITE);
      if (code !== 200) return res.status(code);
      const [newParents, newChildren] = [{}, {}];
      for (const shortname in lineage.parents ?? {}) {
        const [, parent] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
        if (!parent) return res.status(400);
        newParents[shortname] = true;
        if (!(shortname in item.parents)) {
          [code,] = await api.item.putLineage(parent.id, item.id, ...lineage.parents[shortname]);
        }
      }
      for (const shortname in lineage.children ?? {}) {
        const [, child] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
        if (!child) return res.status(400);
        newChildren[shortname] = true;
        if (!(shortname in item.children)) {
          [code, ] = await api.item.putLineage(item.id, child.id, ...lineage.children[shortname].reverse());
        }
      }
      for (const shortname in item.parents) {
        if (!newParents[shortname]) {
          const [, parent] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
          api.item.delLineage(parent.id, item.id);
        }
      }
      for (const shortname in item.children) {
        if (!newChildren[shortname]) {
          const [, child] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
          api.item.delLineage(item.id, child.id);
        }
      }
    }
    res.status(code);
    res.redirect(`${ADDR_PREFIX}/universes/${req.params.universeShortname}/items/${req.params.itemShortname}`);
  });

  get('/universes/:shortname/permissions', async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, users] = await api.user.getMany();
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('editUniversePerms', { universe, users });
  });
  post('/universes/:shortname/permissions', async (req, res) => {
    const { session, params, body } = req;
    const [_, user] = await api.user.getOne({ username: req.body.username });
    const [code, data] = await api.universe.putPermissions(session.user, params.shortname, user, body.permission_level, perms.ADMIN);
    res.status(code);
    if (code !== 200) return;
    res.redirect(`${ADDR_PREFIX}/universes/${params.shortname}/permissions`);
  });

  get('/search', async (req, res) => {
    const search = req.query.search;
    if (search) {
      const [code1, universes] = await api.universe.getMany(req.session.user, { strings: ['title LIKE ?'], values: [`%${search}%`] });
      const [code2, items] = await api.item.getMany(req.session.user, null, perms.READ, true, { search });
      const code = code1 !== 200 ? code1 : code2;
      res.status(code);
      if (code !== 200) return;
      res.prepareRender('search', { items, universes, search });
    } else {
      res.prepareRender('search', { items: [], universes: [], search: '' });
    }
    
  });
}