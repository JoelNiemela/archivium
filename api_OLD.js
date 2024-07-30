const db = require('./db');
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

class APIGetMethods {

  /**
   * 
   * @param {*} user 
   * @param {*} id 
   * @param {boolean} permissionRequired only return item if user has write access
   * @returns 
   */
  async itemById(user, id, permissionRequired=1) {

    const conditions = { 
      strings: [
        'items.id = ?',
      ], values: [
        id,
      ]
    };

    const [errCode, data] = await api.get.items(user, conditions, [3, 2, 1].filter(num => num >= permissionRequired));
    if (errCode) return [errCode, null];
    const item = data[0];
    if (!item) return [user ? 403 : 401, null];
    return [null, item];
  }
}

class APIPostMethods {
  /**
   * for internal use only - does not conform to the standard return format!
   * @returns 
   */
  session() {
    const data = utils.createRandom32String();
    const hash = utils.createHash(data);
    const queryString = `INSERT INTO sessions SET ?`;
    return executeQuery(queryString, { hash });
  }

  /**
   * 
   * @param {*} userData 
   * @returns 
   */
  user({ username, password }) {
    const salt = utils.createRandom32String();
  
    const newUser = {
      username,
      salt,
      password: utils.createHash(password, salt)
    };
  
    const queryString = `INSERT INTO users SET ?`;
    return this.executeQuery(queryString, newUser);
  }

  /**
   * 
   * @param {*} user 
   * @param {*} body 
   * @returns 
   */
  async universe(user, body) {
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
  }
}

class APIPutMethods {
  /**
   * for internal use only - does not conform to the standard return format!
   * @param {{key: value}} options 
   * @param {{key: value}} values 
   * @returns 
   */
  session(options, values) {
    const parsedOptions = parseData(options);
    const queryString = `UPDATE sessions SET ? WHERE ${parsedOptions.strings.join(' AND ')}`;
    return executeQuery(queryString, Array.prototype.concat(values, parsedOptions.values));
  }
}

class APIDeleteMethods {
  /**
   * for internal use only - does not conform to the standard return format!
   * @param {*} options 
   * @returns 
   */
  session(options) {
    const parsedOptions = parseData(options);
    const queryString = `DELETE FROM sessions WHERE ${parsedOptions.strings.join(' AND ')}`;
    return executeQuery(queryString, parsedOptions.values);
  }
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
};

const api = {
  get: new APIGetMethods(),
  post: new APIPostMethods(),
  put: new APIPutMethods(),
  delete: new APIDeleteMethods(),
  validatePassword: validatePassword,
};

module.exports = api;