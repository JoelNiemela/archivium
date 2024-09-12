const { executeQuery, parseData } = require('../utils');
const utils = require('../../lib/hashUtils');

/**
   * returns a "safe" version of the user object with password data removed unless the includeAuth parameter is true
   * @param {*} options 
   * @param {boolean} includeAuth 
   * @returns {Promise<[status, data]>}
   */
async function getOne(options, includeAuth=false) {
  try {
    if (!options || Object.keys(options).length === 0) throw 'options required for api.get.user';
    const parsedOptions = parseData(options);
    const queryString = `SELECT * FROM user WHERE ${parsedOptions.strings.join(' AND ')} LIMIT 1;`;
    const user = (await executeQuery(queryString, parsedOptions.values))[0];
    if (!includeAuth) {
      delete user.password;
      delete user.salt;
    }
    return [200, user];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

/**
 * 
 * @param {*} options
 * @returns {Promise<[status, data]>}
 */
async function getMany(options, includeEmail=false) {
  try {
    const parsedOptions = parseData(options);
    let queryString;
    if (options) queryString = `
      SELECT 
        id, username, created_at, updated_at ${includeEmail ? ', email' : ''}
      FROM user 
      WHERE ${parsedOptions.strings.join(' AND ')};
    `;
    else queryString = `SELECT id, username, created_at, updated_at ${includeEmail ? ', email' : ''} FROM user;`;
    const users = await executeQuery(queryString, parsedOptions.values);
    return [200, users];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

/**
 * 
 * @param {*} userData 
 * @returns 
 */
function post({ username, email, password }) {
  const salt = utils.createRandom32String();

  if (!username) throw new Error('malformed username');
  if (!email) throw new Error('malformed email');

  const newUser = {
    username,
    email,
    salt,
    password: utils.createHash(password, salt),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const queryString = `INSERT INTO user SET ?`;
  return executeQuery(queryString, newUser);
}

/**
 * 
 * @param {*} attempted 
 * @param {*} password 
 * @param {*} salt 
 * @returns 
 */
function validatePassword(attempted, password, salt) {
  return utils.compareHash(attempted, password, salt);
}

async function put(user_id, userIDToPut, changes) {
  delete changes.username;
  delete changes.email;
  delete changes.password;
  delete changes.id;
  delete changes.salt;
  delete changes.created_at;

  if (Number(user_id) !== Number(userIDToPut)) return [403];

  try {
    return [200, await executeQuery(`UPDATE user SET ? WHERE id = ${userIDToPut};`, changes)];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

/**
 * WARNING: THIS METHOD IS *UNSAFE* AND SHOULD *ONLY* BE CALLED BY AUTHORIZED ROUTES!
 * @param {number} user_id id of user to delete 
 * @returns {Promise<[status, data]>}
 */
async function doDeleteUser(user_id) {
  try {
    const sessionQueryString = `DELETE FROM session WHERE user_id = ${user_id};`;
    const userQueryString = `DELETE FROM user WHERE id = ${user_id};`;
    await executeQuery(sessionQueryString);
    await executeQuery(userQueryString);
    return [200];
  } catch (err) {
    console.error(err);
    return [500];
  }
}

async function del(req) {
  try {  
    const [status, user] = await getOne({ id: req.params.id, email: req.body.email }, true);
    if (user) {
      req.loginId = user.id;
      const isValidUser = validatePassword(req.body.password, user.password, user.salt);
      if (isValidUser) {
        doDeleteUser(req.params.id);
        return [200];
      } else {
        return [401];
      }
    } else {
      return [404];
    }
  } catch (err) {
    console.error(err);
    return [500];
  }
}

module.exports = {
  getOne,
  getMany,
  post,
  validatePassword,
  put,
  del,
};