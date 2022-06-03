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
  models.Universes.getAll()
    .then((data) => {
      res.end(JSON.stringify(data));
    })
    .catch((err) => {
      console.error(err);
    });
});


/*
  API ROUTES
*/
app.get(`${ADDR_PREFIX}/api/universes`, (req, res) => {
  const user = req.session.user ? { id: req.session.user.id, username: req.session.user.username } : null;
  models.Universes.getAll()
    .then((data) => {
      res.json({
        user,
        data,
      });
    })
    .catch((err) => {
      console.error(err);
    });
});
app.get(`${ADDR_PREFIX}/api/universes/:id`, (req, res) => {
  const user = req.session.user ? { id: req.session.user.id, username: req.session.user.username } : null;
  return models.Universes.get({ id: req.params.id })
    .then((data) => {
      res.json({
        user,
        data,
      });
    })
    .catch((err) => {
      console.error(err);
    });
});
app.post(`${ADDR_PREFIX}/api/universes`, (req, res) => {
  const user = req.session.user;
  if (user) {
    console.log(req.body, user);
    return models.Universes.create({
      title: req.body.title,
      authorId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      public: req.body.public === '1',
      objData: req.body.objData,
    })
      .then((data) => {
        console.log(data);
        res.sendStatus(201);
      })
  } else {
    res.sendStatus(401);
  }
});


/* 
  ACCOUNT ROUTES
*/
app.get(`${ADDR_PREFIX}/login`, (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  if (user) {
    return models.Sessions.delete({ id: req.session.id })
      .then((data) => {
        res.clearCookie('archiviumuid', req.session.id);
        res.end(loginTemplate({ username, ADDR_PREFIX }));
      })
      .catch((err) => {
        console.error(err);
      });
  }
  res.end(loginTemplate({ user, ADDR_PREFIX }));
});

app.get(`${ADDR_PREFIX}/signup`, (req, res) => {
  const user = req.session.user;
  const username = user && user.username;
  res.end(signupTemplate({ username, ADDR_PREFIX }));
});

app.get(`${ADDR_PREFIX}/logout`, (req, res) => {
  return models.Sessions.delete({ id: req.session.id })
    .then((data) => {
      res.clearCookie('archiviumuid', req.session.id);
      res.redirect(`${ADDR_PREFIX}/`);
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post(`${ADDR_PREFIX}/login`, (req, res) => {
  return models.Users.get({ username: req.body.username })
    .then((user) => {
      if (user) {
        req.loginId = user.id;
        return models.Users.compare(req.body.password, user.password, user.salt);
      }
    })
    .then((isValidUser) => {
      if (isValidUser) {
        return models.Sessions.update({ id: req.session.id }, { userId: req.loginId })
          .then(() => {
            res.status(200);
            return res.redirect(`${ADDR_PREFIX}/`);
          })
          .catch((err) => {
            console.error(err);
            return res.sendStatus(500);
          })
      } else {
        return res.redirect(`${ADDR_PREFIX}/login`);
      }
    });
});

app.post(`${ADDR_PREFIX}/signup`, (req, res) => {
  return models.Users.create( req.body )
    .then((data) => {
      return models.Sessions.update({ id: req.session.id }, { userId: data.insertId })
        .then(() => {
          res.status(201);
          return res.redirect(`${ADDR_PREFIX}/`);
        })
        .catch((err) => {
          console.error(err);
          return res.sendStatus(500);
        });
    })
    .catch((err) => {
      console.error(err);
      return res.redirect(`${ADDR_PREFIX}/signup`);
    });
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
