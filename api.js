const models = require('./models');

const api = {
  get: {},
  post: {},
  put: {},
};

// returns a version of the user object with password data removed
api.get.userById = async (id) => {
  try {
    const user = await models.Users.get({ id });
    delete user.password;
    delete user.salt;
    return [null, user];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
}

api.get.universeById = async (user, id) => {
  try {
    const data = await models.Universes.get({ id });
    if (data.public || (user && user.id === data.authorId)) return [null, { user, data }];
    else return [user ? 403 : 401, null];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
};

api.get.universes = async (user) => {
  try {
    const data = await models.Universes.getAll(user);
    return [null, { user, data }];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
};

api.post.universes = async (req, res) => {
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
};

module.exports = api;