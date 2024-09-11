const Promise = require('bluebird');
const api = require('../api');
const { ADDR_PREFIX } = require('../config');

module.exports.createSession = (req, res, next) => {
  // console.log('res cookie', res.cookie);
  if (req.cookies['archiviumuid']) {
    api.session.getOne({hash: req.cookies['archiviumuid']})
      .then((session) => {
        if (session) {
          // console.log('session:', session.user);
          if (session.user) {
            req.session = {
              userId: session.userId,
              user: session.user,
              id: session.id
            }
          } else {
            req.session = {
              id: session.id,
              hash: session.hash
            };
          }
          // console.log('AUTH req session', req.session);
          next();
        } else {
          api.session.post()
            .then((data) => {
              return api.session.getOne({ id: data.insertId });
            })
            .then((session) => {
              // console.log('session:', session)
              res.cookie('archiviumuid', session.hash);
              req.session = {
                id: session.id,
                hash: session.hash
              };
              next();
            })
            .catch((err) => {
              console.log(err)
              next();
            });
        }
      })
      .catch((err) => {
        console.log(err)
        next();
      });
  } else {
    api.session.post()
    .then((data) => {
      return api.session.getOne({ id: data.insertId });
    })
    .then((session) => {
      // console.log('session:', session)
      res.cookie('archiviumuid', session.hash);
      req.session = {
        id: session.id,
        hash: session.hash
      };
      // console.log('req session ----->', req.session);
      next();
    })
    .catch((err) => {
      console.log(err)
      next();
    });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

async function refreshSession(user) {
  await api.user.put(user.id, user.id, { updated_at: new Date() });
}

module.exports.verifySession = async (req, res, next) => {
  const user = req.session.user;
  if (user) {
    await refreshSession(user);
    next();
  } else {
    res.sendStatus(401);
  }
}

module.exports.verifySessionOrRedirect = async (req, res, next) => {
  const user = req.session.user;
  if (user) {
    await refreshSession(user);
    next();
  } else {
    const searchQueries = new URLSearchParams(req.query);
    const pageQuery = new URLSearchParams();
    pageQuery.append('page', req.path)
    if (searchQueries.toString()) pageQuery.append('search', searchQueries.toString())
    res.redirect(`${ADDR_PREFIX}/login?${pageQuery.toString()}`);
  }
}
