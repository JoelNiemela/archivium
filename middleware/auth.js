const Promise = require('bluebird');
const api = require('../api');
const { ADDR_PREFIX } = require('../config');
const logger = require('../logger');

module.exports.createSession = async (req, res, next) => {
  if (req.cookies['archiviumuid']) {
    const session = await api.session.getOne({ hash: req.cookies['archiviumuid'] });
    if (session) {
      req.session = {
        id: session.id,
        hash: session.hash
      };
      if (session.user) {
        req.session = {
          ...req.session,
          userId: session.userId,
          user: session.user,
        }
      }
      next();
      return;
    }
  }

  const { insertId } = await api.session.post();
  const session = api.session.getOne({ id: insertId });
  res.cookie('archiviumuid', session.hash, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  req.session = {
    id: session.id,
    hash: session.hash
  };
  next();
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

async function refreshSession(user) {
  await api.user.put(user.id, user.id, { updated_at: new Date() });
}

module.exports.verifySession = async (req, res, next) => {
  const user = req.session.user;
  if (user && user.verified) {
    await refreshSession(user);
    next();
  } else {
    res.sendStatus(401);
  }
}

module.exports.verifySessionOrRedirect = async (req, res, next) => {
  const user = req.session.user;
  if (user && user.verified) {
    await refreshSession(user);
    next();
  } else {
    const searchQueries = new URLSearchParams(req.query);
    const pageQuery = new URLSearchParams();
    pageQuery.append('page', req.path);
    if (searchQueries.toString()) pageQuery.append('search', searchQueries.toString());
    if (user && !user.verified) {
      res.redirect(`${ADDR_PREFIX}/verify?${pageQuery.toString()}`);
    } else {
      res.redirect(`${ADDR_PREFIX}/login?${pageQuery.toString()}`);
    }
  }
}
