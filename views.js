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
    next();
  })

  app.get(`${ADDR_PREFIX}/`, (req, res) => {
    const html = render(req, 'home', {});
    res.end(html);
  });

  /* User Pages */
  app.get(`${ADDR_PREFIX}/users`, Auth.verifySessionOrRedirect, async (req, res) => {
    const [code, users] = await api.user.getMany();
    if (code !== 200) res.sendStatus(errCode);
    else return res.end(render(req, 'userList', { users }));
  });

  app.get(`${ADDR_PREFIX}/users/:username`, async (req, res) => {
    const [code1, user] = await api.user.getOne({ username: req.params.username });
    if (!user) {
      res.status(code1);
      return res.end(render(req, 'error', { code: code1 }));
    }
    const [code2, universes] = await api.universe.getManyByAuthorId(req.session.user, user.id);
    console.log(user)
    if (!universes) {
      res.status(code2);
      return res.end(render(req, 'error', { code: code2 }));
    }
    else return res.end(render(req, 'user', { 
      user,
      gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
      universes,
    }));
  });

  /* Universe Pages */
  app.get(`${ADDR_PREFIX}/universes`, async (req, res) => {
    const [code, universes] = await api.universe.getMany(req.session.user);
    if (code !== 200) res.sendStatus(code);
    else res.end(render(req, 'universeList', { universes }));
  });
 
  app.get(`${ADDR_PREFIX}/universes/create`, async (req, res) => res.end(render(req, 'createUniverse')));
  app.post(`${ADDR_PREFIX}/universes/create`, async (req, res) => {
    const [code, data] = await api.universe.post(req.session.user, {
      ...req.body,
      public: req.body.visibility === 'public',
    });
    res.status(code);
    if (code === 201) {
      res.redirect(`${ADDR_PREFIX}/universes/${req.body.shortname}`);
    } else {
      res.end(render(req, 'createUniverse', { error: data, ...req.body }));
    }
  });
  
  app.get(`${ADDR_PREFIX}/universes/:shortname`, async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    res.end(render(req, 'universe', { universe }));
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/edit`, async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.WRITE);
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    res.end(render(req, 'editUniverse', { universe }));
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/edit`, async (req, res) => {
    req.body = {
      ...req.body,
      public: req.body.visibility === 'public',
    }
    console.log(req.body)
    const [code, data] = await api.universe.put(req.session.user, req.params.shortname, req.body);
    res.status(code);
    if (code === 200) {
      res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}`);
    } else {
      console.log(code, data)
      res.end(render(req, 'editUniverse', { error: data, ...req.body }));
    }
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/items`, async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, items] = await api.item.getByUniverseShortname(req.session.user, req.params.shortname, req.query.type);
    const code = code1 !== 200 ? code1 : code2;
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    res.end(render(req, 'universeItemList', { items, universe, type: req.query.type }));
  });
 
  app.get(`${ADDR_PREFIX}/universes/:shortname/items/create`, async (req, res) => {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    res.end(render(req, 'createItem', { universe, item_type: req.query.type, shortname: req.query.shortname }));
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/items/create`, async (req, res) => {
    const [code, data] = await api.item.post(req.session.user, {
      ...req.body,
    }, req.params.shortname);
    res.status(code);
    if (code === 201) {
      res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}/items/${req.body.shortname}`);
    } else {
      const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
      if (code !== 200) {
        res.status(code);
        return res.end(render(req, 'error', { code }));
      }
      res.end(render(req, 'createItem', { error: data, ...req.body, universe }));
    }
  });

  app.get(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname`, async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.universeShortname });
    const [code2, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname);
    if (code1 !== 200) {
      res.status(code1);
      return res.end(render(req, 'error', { code: code1 }));
    }
    if (!item) {
      if (universe.author_permissions[req.session.user?.id] >= perms.READ) {
        return res.end(render(req, 'error', {
          code: 404,
          hint: 'Looks like this item doesn\'t exist yet. Follow the link below to create it:',
          hintLink: `${ADDR_PREFIX}/universes/${req.params.universeShortname}/items/create?shortname=${req.params.itemShortname}`,
        }));
      } else {
        res.status(code2);
        return res.end(render(req, 'error', { code: code2 }));
      }
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
    res.end(render(req, 'item', { item, universe, parsedBody }));
  });
  app.get(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname/edit`, async (req, res) => {
    const [code, item] = await api.item.getByUniverseAndItemShortnames(req.session.user, req.params.universeShortname, req.params.itemShortname, perms.WRITE);
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    item.obj_data = JSON.parse(item.obj_data);
    res.end(render(req, 'editItem', { item }));
  });
  app.post(`${ADDR_PREFIX}/universes/:universeShortname/items/:itemShortname/edit`, async (req, res) => {
    console.log(req.body)
    if (!('obj_data' in req.body)) {
      return [400];
    }
    req.body.obj_data = decodeURIComponent(req.body.obj_data);
    const [code, data] = await api.item.put(req.session.user, req.params.universeShortname, req.params.itemShortname, req.body);
    res.status(code);
    if (code === 200) {
      res.redirect(`${ADDR_PREFIX}/universes/${req.params.universeShortname}/items/${req.params.itemShortname}`);
    } else {
      console.log(code, data)
      res.end(render(req, 'editItem', { error: data, ...req.body }));
    }
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/permissions`, async (req, res) => {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, users] = await api.user.getMany();
    const code = code1 !== 200 ? code1 : code2;
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code }));
    }
    res.end(render(req, 'editUniversePerms', { universe, users }));
  });
  app.post(`${ADDR_PREFIX}/universes/:shortname/permissions`, async (req, res) => {
    const [_, user] = await api.user.getOne({ username: req.body.username });
    // TODO do this properly. ADMIN PERMS SHOULD BE REQUIRED!!
    const [code, data] = await api.universe.putPermissions(req.session.user, req.params.shortname, user, req.body.permission_level);
    res.redirect(`${ADDR_PREFIX}/universes/${req.params.shortname}/permissions`);
  });
}