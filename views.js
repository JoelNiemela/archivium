const { ADDR_PREFIX } = require('./config');
const Auth = require('./middleware/auth');
const api = require('./api');
const md5 = require('md5');
const { render } = require('./templates');

module.exports = function(app) {
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
    const [code2, universes] = await api.universe.getManyByAuthorId(req.session.user, user.id);
    const code = code1 !== 200 ? code1 : code2;
    console.log(user)
    if (!user || !universes) {
      res.status(code);
      return res.end(render(req, 'error', { code: code }));
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
    else return res.end(render(req, 'universeList', { universes }));
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
      return res.end(render(req, 'error', { code: code }));
    }
    else return res.end(render(req, 'universe', { universe }));
  });

  app.get(`${ADDR_PREFIX}/universes/:shortname/items`, async (req, res) => {

    console.log(req.query);
  
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    if (code1 !== 200) {
      res.status(code1);
      return res.end(render(req, 'error', { code: code1 }));
    }
  
    const [code2, items] = await api.item.getByUniverseShortname(req.session.user, req.params.shortname, req.query.type);
    if (code2 !== 200) {
      res.status(code2);
      return res.end(render(req, 'error', { code: code2 }));
    }
    else return res.end(render(req, 'universeItemList', { items, universe }));
  });
}