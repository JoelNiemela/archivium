const { ADDR_PREFIX } = require('./config');
const Auth = require('./middleware/auth');
const api = require('./api');
const md5 = require('md5');
const { render } = require('./templates');
const { perms } = require('./api/utils');
const { parseMarkdown } = require('./templates/markdown');

module.exports = function(app) {
  app.use((req, res, next) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.prepareRender = (template, data={}) => {
      res.templateData = [template, data];
    };
    next();
  })

  app.get(`${ADDR_PREFIX}/`, (_, res, next) => {
    res.prepareRender('home');
    next();
  });

  /* User Pages */
  app.get(`${ADDR_PREFIX}/users`, Auth.verifySessionOrRedirect, async (_, res, next) => {
    const [code, users] = await api.user.getMany();
    res.status(code);
    if (!users) return next();
    res.prepareRender('userList', { users });
    next();
  });

  app.get(`${ADDR_PREFIX}/users/:username`, async (req, res, next) => {
    const [code1, user] = await api.user.getOne({ username: req.params.username });
    res.status(code1);
    if (!user) return next();
    const [code2, universes] = await api.universe.getManyByAuthorId(req.session.user, user.id);
    console.log(user)
    res.status(code2);
    if (!universes) return next();
    res.prepareRender('user', { 
      user,
      gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
      universes,
    });
    next();
  });

  /* Universe Pages */
  app.get(`${ADDR_PREFIX}/universes`, async (req, res, next) => {
    const [code, universes] = await api.universe.getMany(req.session.user);
    res.status(code);
    if (!universes) return next();
    res.prepareRender('universeList', { universes });
    next();
  });
 
  app.get(`${ADDR_PREFIX}/universes/create`, async (_, res, next) => {
    res.prepareRender('createUniverse');
    next();
  });
  app.post(`${ADDR_PREFIX}/universes/create`, async (req, res, next) => {
    const [code, data] = await api.universe.post(req.session.user, {
      ...req.body,
      public: req.body.visibility === 'public',
    });
    res.status(code);
    if (code === 201) return res.redirect(`${ADDR_PREFIX}/universes/${req.body.shortname}`);
    res.prepareRender('createUniverse', { error: data, ...req.body });
    next();
  });
  
  app.get(`${ADDR_PREFIX}/universes/:shortname`, async (req, res, next) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (!universe) return next();
    res.prepareRender('universe', { universe });
    next();
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/edit`, async (req, res, next) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.WRITE);
    res.status(code);
    if (!universe) return next();
    res.prepareRender('editUniverse', { universe });
    next();
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/edit`, async (req, res, next) => {
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
    next();
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/items`, async (req, res, next) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, items] = await api.item.getByUniverseShortname(req.session.user, req.params.shortname, req.query.type);
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return next();
    res.prepareRender('universeItemList', { items, universe, type: req.query.type });
    next();
  });
 
  app.get(`${ADDR_PREFIX}/universes/:shortname/items/create`, async (req, res, next) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (code !== 200) return next();
    res.prepareRender('createItem', { universe, item_type: req.query.type, shortname: req.query.shortname });
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/items/create`, async (req, res, next) => {
    const [userCode, data] = await api.item.post(req.session.user, {
      ...req.body,
    }, req.params.shortname);
    res.status(userCode);
    if (userCode === 201) return res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}/items/${req.body.shortname}`);
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code);
    if (code !== 200) return next();
    res.prepareRender('createItem', { error: data, ...req.body, universe });
  });

  app.get(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname`, async (req, res, next) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.universeShortname });
    const [code2, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname);
    res.status(code1);
    if (code1 !== 200) return next();
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
      return next();
    }
    item.obj_data = JSON.parse(item.obj_data);
    const parsedBody = 'body' in item.obj_data && (await parseMarkdown(item.obj_data.body || '').evaluate(req.params.universeShortname))
    if ('tabs' in item.obj_data) {
      for (const tab in item.obj_data.tabs) {
        for (const key in item.obj_data.tabs[tab]) {
          item.obj_data.tabs[tab][key] = await parseMarkdown(item.obj_data.tabs[tab][key]).evaluate(req.params.universeShortname);
        }
      }
    }
    res.prepareRender('item', { item, universe, parsedBody });
    next();
  });
  app.get(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname/edit`, async (req, res, next) => {
    const [code1, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname, perms.WRITE);
    const [code2, itemList] = await api.item.getByUniverseId(req.session.user, item.universe_id);
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return next();
    item.obj_data = JSON.parse(item.obj_data);
    if (Object.keys(item.parents).length > 0 || Object.keys(item.children).length > 0) {
      item.obj_data.lineage = { ...item.obj_data.lineage };
      item.obj_data.lineage.parents = item.parents;
      item.obj_data.lineage.children = item.children;
    }
    const itemMap = {};
    itemList.forEach(item => itemMap[item.shortname] = item.title);
    res.prepareRender('editItem', { item, itemMap });
    next();
  });
  app.post(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname/edit`, async (req, res, next) => {
    console.log(req.body)
    if (!('obj_data' in req.body)) {
      res.status(400);
      return next(); // We should probably render an error on the edit page instead here.
    }
    req.body.obj_data = JSON.parse(decodeURIComponent(req.body.obj_data));
    let lineage;
    if ('lineage' in req.body.obj_data) {
      lineage = req.body.obj_data.lineage;
      req.body.obj_data.lineage = { title: lineage.title };
    }
    let code; let data;
    req.body.obj_data = JSON.stringify(req.body.obj_data);
    function nextWithCode(code) {
      res.status(code);
      next();
    }
    [code, data] = await api.item.put(req.session.user, req.params.universeShortname, req.params.itemShortname, req.body);
    if (code !== 200) {
      res.prepareRender('editItem', { error: data, ...req.body });
      return next();
    }
    if (lineage) {
      let item;
      [code, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname, perms.WRITE);
      if (code !== 200) return nextWithCode(code);
      const [newParents, newChildren] = [{}, {}];
      for (const shortname in lineage.parents ?? {}) {
        const [, parent] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
        if (!parent) return nextWithCode(400);
        newParents[shortname] = true;
        if (!(shortname in item.parents)) {
          [code,] = await api.item.putLineage(parent.id, item.id, ...lineage.parents[shortname].reverse());
        }
      }
      for (const shortname in lineage.children ?? {}) {
        const [, child] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, shortname, perms.WRITE);
        if (!child) return nextWithCode(400);
        newChildren[shortname] = true;
        if (!(shortname in item.children)) {
          [code, ] = await api.item.putLineage(item.id, child.id, ...lineage.children[shortname]);
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

  app.get(`${ADDR_PREFIX}/universes/:shortname/permissions`, async (req, res, next) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, users] = await api.user.getMany();
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return next();
    res.prepareRender('editUniversePerms', { universe, users });
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/permissions`, async (req, res) => {
    const { session, params, body } = req;
    const [_, user] = await api.user.getOne({ username: req.body.username });
    const [code, data] = await api.universe.putPermissions(session.user, params.shortname, user, body.permission_level, perms.ADMIN);
    res.status(code);
    if (code !== 200) return next();
    res.redirect(`${ADDR_PREFIX}/universes/${params.shortname}/permissions`);
  });

  app.use((req, res) => {
    try {
      const [template, data] = res.templateData;
      res.end(render(req, template, data));
    } catch (err) {
      let code = res.statusCode;
      if (code === 200) code = 404; // This is ugly...
      console.error(`Error ${code} rendered`);
      res.end(render(req, 'error', { code }));
    }
  })
}