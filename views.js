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
  app.get(`${ADDR_PREFIX}/users`, Auth.verifySession, async (req, res) => {
    const [code, users] = await api.user.getMany();
    if (code !== 200) res.sendStatus(errCode);
    else return res.end(render(req, 'userList', { users }));
  });

  app.get(`${ADDR_PREFIX}/users/:username`, async (req, res) => {
    const [code1, user] = await api.user.getOne({ username: req.params.username });
    const [code2, universes] = await api.universe.getManyByAuthorId(req.session.user, user.id);
    const code = code1 !== 200 ? code1 : code2;
    if (code !== 200) {
      res.status(code);
      return res.end(render(req, 'error', { code: code }));
    }
    else return res.end(render(req, 'user', { 
      user,
      gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
      universes,
    }));
  });
}