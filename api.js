const db = require('./database');
const utils = require('./lib/hashUtils');
const _ = require('lodash');

const executeQuery = (query, values) => {
  return db.queryAsync(query, values).spread(results => results);
};

const parseData = (options) => {
  return _.reduce(options, (parsed, value, key) => {
    parsed.string.push(`${key} = ?`);
    parsed.values.push(value);
    return parsed;
  }, { string: [], values: [] });
};

const api = {
  get: {},
  post: {},
  put: {},
  delete: {},
};

/* for internal use only - does not conform to the standard return format! */
api.get.session = async (options) => {
  const parsedOptions = parseData(options);
  const queryString = `SELECT * FROM sessions WHERE ${parsedOptions.string.join(' AND ')} LIMIT 1;`;
  const data = await executeQuery(queryString, parsedOptions.values);
  const session = data[0];
  if (!session || !session.userId) return session;
  const [errCode, user] = await api.get.user({ id: session.userId });
  session.user = user;
  return session;
};
api.post.session = () => {
  const data = utils.createRandom32String();
  const hash = utils.createHash(data);
  const queryString = `INSERT INTO sessions SET ?`;
  return executeQuery(queryString, { hash });
};
api.put.session = (options, values) => {
  const parsedOptions = parseData(options);
  const queryString = `UPDATE sessions SET ? WHERE ${parsedOptions.string.join(' AND ')}`;
  return executeQuery(queryString, Array.prototype.concat(values, parsedOptions.values));
}; 
api.delete.session = (options) => {
  const parsedOptions = parseData(options);
  const queryString = `DELETE FROM sessions WHERE ${parsedOptions.string.join(' AND ')}`;
  return executeQuery(queryString, parsedOptions.values);
}; 
api.validatePassword = (attempted, password, salt) => {
  return utils.compareHash(attempted, password, salt);
};

/* standard API functions */

// returns a version of the user object with password data removed unless the includeAuth parameter is true
api.get.user = async (options, includeAuth=false) => {
  try {
    if (!options || Object.keys(options).length === 0) throw 'options required for api.get.user';
    const parsedOptions = parseData(options);
    let queryString;
    if (options) queryString = `SELECT * FROM users WHERE ${parsedOptions.string.join(' AND ')} LIMIT 1;`;
    else queryString = 'SELECT * FROM users LIMIT 1;';
    const user = (await executeQuery(queryString, parsedOptions.values))[0];
    if (!includeAuth) {
      delete user.password;
      delete user.salt;
    }
    return [null, user];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
};

api.post.user = ({ username, password }) => {
  const salt = utils.createRandom32String();

  const newUser = {
    username,
    salt,
    password: utils.createHash(password, salt)
  };

  const queryString = `INSERT INTO users SET ?`;
  return this.executeQuery(queryString, newUser);
};

api.get.universeById = async (user, id) => {
  const [errCode, data] = await api.get.universes(user, { 
    strings: [
      'universeId = ?',
    ], values: [
      id,
    ] 
  });
  if (errCode) return [errCode, null];
  const universe = data[0];
  if (!universe) return [user ? 403 : 401, null];
  return [null, universe];
};

api.get.universesByAuthorId = async (user, authorId) => {
  return api.get.universes(user, { 
    strings: [
      'universeId IN (SELECT universeId FROM authoruniverses as au WHERE au.userId = ? AND au.permissionLevel <> 0)',
    ], values: [
      authorId,
    ] 
  });
};

api.get.universes = async (user, conditions) => {
  try {
    const usrQueryString = user ? ` OR universeId IN (SELECT universeId FROM authoruniverses as a WHERE a.userId = ${user.id} AND a.permissionLevel <> 0)` : '';
    const conditionString = conditions ? ` AND ${conditions.strings.join(' AND ')}` : '';
    const queryString = `
      SELECT
        universes.*,
        JSON_OBJECTAGG(users.id, users.username) as authors,
        JSON_OBJECTAGG(users.id, authoruniverses.permissionLevel) as authorPermissions
      FROM authoruniverses
      INNER JOIN universes ON universes.id = universeId 
      INNER JOIN users ON users.id = userId
      WHERE (universes.public = 1${usrQueryString})
      ${conditionString}
      GROUP BY universeId;`;
    const data = await executeQuery(queryString, conditions && conditions.values);
    return [null, data];
  } catch (err) {
    console.error(err);
    return [500, null];
  }
};

api.post.universe = async (user, body) => {
  let queryString1 = `INSERT INTO universes SET ?`;
  const data = await executeQuery(queryString1, {
    title: body.title,
    authorId: user.id,
    public: body.public === '1',
    objData: body.objData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(data.insertId);
  const queryString2 = `INSERT INTO authoruniverses SET ?`;
  return [data, await executeQuery(queryString2, {
    universeId: data.insertId,
    userId: user.id,
    permissionLevel: 3,

  })];
};

module.exports = api;