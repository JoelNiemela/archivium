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
    console.log(req.method, req.path, req.body || '');
    next();
  })
}

// Serve static assets
app.use(`${ADDR_PREFIX}/static`, express.static(path.join(__dirname, 'static/')));

// Load view routes
require('./views')(app);



app.get(`${ADDR_PREFIX}/universes/:id/items`, async (req, res) => {

  console.log(req.query);

  const [errCode1, universe] = await api.get.universeById(req.session.user, req.params.id);
  if (errCode1) {
    res.status(errCode1);
    return res.end(errorTemplate({ code: errCode1, ...contextData(req) }));
  }

  const conditions = { 
    strings: [
      'items.universeId = ?',
    ], values: [
      req.params.id,
    ]
  };

  if (req.query.type) {
    conditions.strings.push('items.itemType = ?');
    conditions.values.push(req.query.type);
  }

  const [errCode2, items] = await api.get.items(req.session.user, conditions);
  if (errCode2) {
    res.status(errCode2);
    return res.end(errorTemplate({ code: errCode2, ...contextData(req) }));
  }
  else return res.end(universeItemListTemplate({ items, universe, ...contextData(req) }));
});

app.get(`${ADDR_PREFIX}/universes/:universeId/items/:itemId`, async (req, res) => {
  const [errCode, item] = await api.get.itemById(req.session.user, req.params.itemId);
  if (errCode) {
    res.status(errCode);
    return res.end(errorTemplate({ code: errCode, ...contextData(req) }));
  }
  if (item.universeId != req.params.universeId) {
    res.status(404);
    return res.end(errorTemplate({
      code: 404,
      hint: 'Could this be the page you\'re looking for?',
      hintLink: `${ADDR_PREFIX}/universes/${item.universeId}/items/${item.id}`,
      ...contextData(req)
    }));
  }
  item.objData = JSON.parse(item.objData);
  return res.end(itemTemplate({ item, ...contextData(req) }));
});

app.get(`${ADDR_PREFIX}/universes/:id/edit`, async (req, res) => {
  return res.end(editUniverseTemplate({ ...contextData(req) }));
});





app.get(`${ADDR_PREFIX}/universes/:universeId/items/:itemId/edit`, async (req, res) => {
  const [errCode, item] = await api.get.itemById(req.session.user, req.params.itemId);
  if (errCode) {
    res.status(errCode);
    return res.end(errorTemplate({ code: errCode, ...contextData(req) }));
  }
  if (item.universeId != req.params.universeId) {
    res.status(404);
    return res.end(errorTemplate({
      code: 404,
      hint: 'Could this be the page you\'re looking for?',
      hintLink: `${ADDR_PREFIX}/universes/${item.universeId}/items/${item.id}`,
      ...contextData(req)
    }));
  }
  item.objData = JSON.parse(item.objData);
  
  return res.end(editItemTemplate({ item, ...contextData(req) }));
});



// Load api routes
require('./api/routes')(app);


/*
  API ROUTES
*/



app.get(`${ADDR_PREFIX}/api/universes/:id/items`, async (req, res) => {
  const [errCode, result] = await api.get.itemsByUniverseId(req.session.user, req.params.id);
  if (errCode) res.sendStatus(errCode);
  else res.json(result);
});

app.get(`${ADDR_PREFIX}/api/universes/:universeId/items/:itemId`, async (req, res) => {
  const [errCode, item] = await api.get.itemById(req.session.user, req.params.itemId);
  if (errCode) res.sendStatus(errCode);
  if (item.universeId != req.params.universeId) res.sendStatus(404);
  else res.json(item);
});



app.get(`${ADDR_PREFIX}/api/users/:id`, async (req, res) => {
  const [errCode, user] = await api.get.user({ id: req.params.id });
  if (errCode) res.sendStatus(errCode);
  else res.json(user);
});

app.get(`${ADDR_PREFIX}/api/users/:id/universes`, async (req, res) => {
  const [errCode, universes] = await api.get.universesByAuthorId(req.session.user, req.params.id);
  if (errCode) res.sendStatus(errCode);
  else res.json(universes);
});

app.post(`${ADDR_PREFIX}/api/universes/:universeId/items`, async (req, res) => {
  if (req.session.user) {
    const [errCode, data] = await api.post.item(req.session.user, req.body, req.params.universeId);
    if (errCode) return res.sendStatus(errCode);
    console.log(data);
    return res.sendStatus(201);
  } else {
    return res.sendStatus(401);
  }
});



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
