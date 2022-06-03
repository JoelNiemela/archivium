const express = require('express');
const path = require('path');
const models = require('./models');
const CookieParser = require('./middleware/cookieParser');
const Auth = require('./middleware/auth');
const pug = require('pug');

const PORT = 3004;
const { ADDR_PREFIX } = require('./config');

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(CookieParser);
app.use(Auth.createSession);

// compile templates
const errorTemplate = pug.compileFile('templates/error.pug');
const homeTemplate = pug.compileFile('templates/home.pug');
const loginTemplate = pug.compileFile('templates/login.pug');
const signupTemplate = pug.compileFile('templates/signup.pug');

// Serve static assets
app.use(`${ADDR_PREFIX}/assets`, express.static(path.join(__dirname, 'assets/')));

/*
  VIEW ROUTES
*/
app.get(`${ADDR_PREFIX}/`, (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  const html = homeTemplate({ username, ADDR_PREFIX });
  res.end(html);
});

app.get(`${ADDR_PREFIX}/universes`, Auth.verifySession, (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  const html = homeTemplate({ username, ADDR_PREFIX });
  res.end(html);
});


/*
  API ROUTES
*/
app.get(`${ADDR_PREFIX}/api/universes`, async (req, res) => {
  const user = req.session.user ? { id: req.session.user.id, username: req.session.user.username } : null;
  try {
    const data = await models.Universes.getAll();
    res.json({ user, data });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});
app.get(`${ADDR_PREFIX}/api/universes/:id`, async (req, res) => {
  const user = req.session.user ? { id: req.session.user.id, username: req.session.user.username } : null;
  try {
    const data = await models.Universes.get({ id: req.params.id });
    if (data.public || (user && user.id === data.authorId)) res.json({ user, data });
    else res.sendStatus(user ? 403 : 401);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});
app.post(`${ADDR_PREFIX}/api/universes`, async (req, res) => {
  const user = req.session.user;
  if (user) {
    const data = await models.Universes.create({
      title: req.body.title,
      authorId: user.id,
      public: req.body.public === '1',
      objData: req.body.objData,
    });
    console.log(data);
    res.sendStatus(201);
  } else {
    res.sendStatus(401);
  }
});


/* 
  ACCOUNT ROUTES
*/
app.get(`${ADDR_PREFIX}/login`, async (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  if (user) {
    try {
      await models.Sessions.delete({ id: req.session.id })
      res.clearCookie('archiviumuid', req.session.id);
      res.end(loginTemplate({ username, ADDR_PREFIX }));
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
  res.end(loginTemplate({ user, ADDR_PREFIX }));
});

app.get(`${ADDR_PREFIX}/signup`, (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  res.end(signupTemplate({ username, ADDR_PREFIX }));
});

app.get(`${ADDR_PREFIX}/logout`, async (req, res) => {
  try {
    await models  .Sessions.delete({ id: req.session.id })
    res.clearCookie('archiviumuid', req.session.id);
    res.redirect(`${ADDR_PREFIX}/`);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.post(`${ADDR_PREFIX}/login`, async (req, res) => {
  try {  
    const user = await models.Users.get({ username: req.body.username });
    if (user) {
      req.loginId = user.id;
      const isValidUser = models.Users.compare(req.body.password, user.password, user.salt);
      if (isValidUser) {
        await models.Sessions.update({ id: req.session.id }, { userId: req.loginId });
        res.status(200);
        return res.redirect(`${ADDR_PREFIX}/`);
      } else {
        return res.redirect(`${ADDR_PREFIX}/login`);
      }
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.post(`${ADDR_PREFIX}/signup`, async (req, res) => {
  try {
    const data = await models.Users.create( req.body );
    try {
      await models.Sessions.update({ id: req.session.id }, { userId: data.insertId });
      res.status(201);
      return res.redirect(`${ADDR_PREFIX}/`);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
  } catch (err) {
    console.error(err);
    return res.redirect(`${ADDR_PREFIX}/signup`);
  }
});

// 404 errors
app.use((req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  res.status(404);
  res.end(errorTemplate({ code: 404, username, ADDR_PREFIX }));
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
