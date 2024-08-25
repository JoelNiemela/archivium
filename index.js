const express = require('express');
const path = require('path');
const api = require('./api');
const { render } = require('./templates');

const CookieParser = require('./middleware/cookieParser');
const Auth = require('./middleware/auth');

const { PORT, ADDR_PREFIX, DEV_MODE } = require('./config');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(CookieParser);
app.use(Auth.createSession);


// Logger if in Dev Mode
if (DEV_MODE) {
  app.use('/', (req, res, next) => {
    console.log(req.method, req.path, req.body || '', req.session.user?.username ?? 'anonymous');
    next();
  })
}

// Serve static assets
app.use(`${ADDR_PREFIX}/static`, express.static(path.join(__dirname, 'static/')));

// Load view routes
require('./views')(app);

// Load api routes
require('./api/routes')(app);


/* 
  ACCOUNT ROUTES
*/
async function logout(req, res) {
  await api.session.delete({ id: req.session.id })
  res.clearCookie('archiviumuid', req.session.id);
}

app.get(`${ADDR_PREFIX}/login`, async (req, res) => {
  if (req.session.user) {
    try {
      await logout(req, res);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
  res.end(render(req, 'login'));
});

app.get(`${ADDR_PREFIX}/signup`, (req, res) => {
  res.end(render(req, 'signup'));
});

app.get(`${ADDR_PREFIX}/logout`, async (req, res) => {
  try {
    await logout(req, res);
    res.redirect(`${ADDR_PREFIX}/`);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.post(`${ADDR_PREFIX}/login`, async (req, res) => {
  try {  
    const [errCode, user] = await api.user.getOne({ username: req.body.username }, true);
    if (user) {
      req.loginId = user.id;
      const isCorrectLogin = api.user.validatePassword(req.body.password, user.password, user.salt);
      if (isCorrectLogin) {
        await api.session.put({ id: req.session.id }, { user_id: req.loginId });
        // // Atypical use of user.put, normally the first argument should be req.session.user.id
        // await api.user.put(user.id, user.id, { updated_at: new Date() });
        res.status(200);
        return res.redirect(`${ADDR_PREFIX}/`);
      } else {
        res.status(401);
        return res.end(render(req, 'login', { error: 'Username or password incorrect.' }));
      }
    } else {
      res.status(401);
      return res.end(render(req, 'login', { error: 'Username or password incorrect.' }));
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.post(`${ADDR_PREFIX}/signup`, async (req, res) => {
  try {
    const data = await api.user.post( req.body );
    try {
      await api.session.put({ id: req.session.id }, { user_id: data.insertId });
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
  res.status(404);
  res.end(render(req, 'error', { code: 404 }));
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
