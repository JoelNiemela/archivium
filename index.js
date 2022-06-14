const express = require('express');
const path = require('path');
const api = require('./api');
const CookieParser = require('./middleware/cookieParser');
const Auth = require('./middleware/auth');
const pug = require('pug');
const md5 = require('md5');

const { PORT, ADDR_PREFIX, DEV_MODE } = require('./config');

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(CookieParser);
app.use(Auth.createSession);

// compile templates
const errorTemplate = pug.compileFile('templates/error.pug');
const homeTemplate = pug.compileFile('templates/home.pug');
const loginTemplate = pug.compileFile('templates/login.pug');
const signupTemplate = pug.compileFile('templates/signup.pug');

const universeTemplate = pug.compileFile('templates/view/universe.pug');
const editUniverseTemplate = pug.compileFile('templates/edit/universe.pug');
const universeListTemplate = pug.compileFile('templates/list/universes.pug');

const itemTemplate = pug.compileFile('templates/view/item.pug');
const editItemTemplate = pug.compileFile('templates/edit/item.pug');
const itemListTemplate = pug.compileFile('templates/list/items.pug');

const universeItemListTemplate = pug.compileFile('templates/list/universeItems.pug');

const userTemplate = pug.compileFile('templates/view/user.pug');
const userListTemplate = pug.compileFile('templates/list/users.pug');



// const itemTemplate = pug.compileFile('templates/item.pug');

// Logger if in Dev Mode
if (DEV_MODE) {
  app.use('/', (req, res, next) => {
    console.log(req.method, req.path, req.body || '');
    next();
  })
}

// Basic context information to be sent to the templates
function contextData(req) {
  const user = req.session.user;
  const contextUser = user ? { id: user.id, username: user.username } : null;
  return {
    contextUser,
    ADDR_PREFIX,
  };
}

// Serve static assets
app.use(`${ADDR_PREFIX}/static`, express.static(path.join(__dirname, 'static/')));

/*
  VIEW ROUTES
*/
app.get(`${ADDR_PREFIX}/`, (req, res) => {
  const html = homeTemplate({ ...contextData(req) });
  res.end(html);
});



app.get(`${ADDR_PREFIX}/universes`, async (req, res) => {
  const [errCode, universes] = await api.get.universes(req.session.user);
  if (errCode) res.sendStatus(errCode);
  else return res.end(universeListTemplate({ universes, ...contextData(req) }));
});

app.get(`${ADDR_PREFIX}/universes/:id`, async (req, res) => {
  const [errCode, universe] = await api.get.universeById(req.session.user, req.params.id);
  if (errCode) {
    res.status(errCode);
    return res.end(errorTemplate({ code: errCode, ...contextData(req) }));
  }
  else return res.end(universeTemplate({ universe, ...contextData(req) }));
});

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



app.get(`${ADDR_PREFIX}/users`, Auth.verifySession, async (req, res) => {
  const [errCode, users] = await api.get.users();
  if (errCode) res.sendStatus(errCode);
  else return res.end(userListTemplate({ users, ...contextData(req) }));
});

app.get(`${ADDR_PREFIX}/users/:id`, async (req, res) => {
  const [errCode1, user] = await api.get.user({ id: req.params.id });
  const [errCode2, universes] = await api.get.universesByAuthorId(req.session.user, req.params.id);
  if (errCode1) {
    res.status(errCode1 || errCode2);
    return res.end(errorTemplate({ code: errCode1 || errCode2, ...contextData(req) }));
  }
  else return res.end(userTemplate({ 
    user,
    gravatarLink: `http://www.gravatar.com/avatar/${md5(user.email)}.jpg`,
    universes,
    ...contextData(req)
  }));
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




/*
  API ROUTES
*/
app.get(`${ADDR_PREFIX}/api/universes`, async (req, res) => {
  const [errCode, universes] = await api.get.universes(req.session.user);
  if (errCode) res.sendStatus(errCode);
  else res.json(universes);
});

app.get(`${ADDR_PREFIX}/api/universes/:id`, async (req, res) => {
  const [errCode, universe] = await api.get.universeById(req.session.user, req.params.id);
  if (errCode) res.sendStatus(errCode);
  else res.json(universe);
});



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



app.post(`${ADDR_PREFIX}/api/universes`, async (req, res) => {
  if (req.session.user) {
    const data = await api.post.universe(req.session.user, req.body);
    console.log(data);
    return res.sendStatus(201);
  } else {
    return res.sendStatus(401);
  }
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
app.get(`${ADDR_PREFIX}/login`, async (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  if (user) {
    try {
      await api.delete.session({ id: req.session.id })
      res.clearCookie('archiviumuid', req.session.id);
      res.end(loginTemplate({ ...contextData(req) }));
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
  res.end(signupTemplate({ ...contextData(req) }));
});

app.get(`${ADDR_PREFIX}/logout`, async (req, res) => {
  try {
    await api.delete.session({ id: req.session.id })
    res.clearCookie('archiviumuid', req.session.id);
    res.redirect(`${ADDR_PREFIX}/`);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.post(`${ADDR_PREFIX}/login`, async (req, res) => {
  try {  
    const [errCode, user] = await api.get.user({ username: req.body.username }, true);
    if (user) {
      req.loginId = user.id;
      const isValidUser = api.validatePassword(req.body.password, user.password, user.salt);
      if (isValidUser) {
        await api.put.session({ id: req.session.id }, { userId: req.loginId });
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
    const data = await api.post.user( req.body );
    try {
      await api.put.session({ id: req.session.id }, { userId: data.insertId });
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
  res.end(errorTemplate({ code: 404, ...contextData(req) }));
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
