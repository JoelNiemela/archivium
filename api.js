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

class APIGetMethods {
  /**
   * for internal use only - does not conform to the standard return format!
   * @param {{key: value}} options
   * @returns {Promise<session>}
   */
  async session(options) {
    const parsedOptions = parseData(options);
    const queryString = `SELECT * FROM sessions WHERE ${parsedOptions.string.join(' AND ')} LIMIT 1;`;
    const data = await executeQuery(queryString, parsedOptions.values);
    const session = data[0];
    if (!session || !session.userId) return session;
    const [errCode, user] = await api.get.user({ id: session.userId });
    session.user = user;
    return session;
  }

  /**
   * returns a "safe" version of the user object with password data removed unless the includeAuth parameter is true
   * @param {*} options 
   * @param {boolean} includeAuth 
   * @returns {Promise<[errCode, data]>}
   */
  async user(options, includeAuth=false) {
    try {
      if (!options || Object.keys(options).length === 0) throw 'options required for api.get.user';
      const parsedOptions = parseData(options);
      const queryString = `SELECT * FROM users WHERE ${parsedOptions.string.join(' AND ')} LIMIT 1;`;
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
  }

  /**
   * 
   * @param {*} options 
   * @returns 
   */
  async users(options) {
    try {
      const parsedOptions = parseData(options);
      let queryString;
      if (options) queryString = `
        SELECT 
          id, username,
          createdAt, updatedAt
        FROM users 
        WHERE ${parsedOptions.string.join(' AND ')};
      `;
      else queryString = 'SELECT id, username, createdAt, updatedAt FROM users;';
      const users = await executeQuery(queryString, parsedOptions.values);
      return [null, users];
    } catch (err) {
      console.error(err);
      return [500, null];
    }
  }

  /**
   * 
   * @param {*} user 
   * @param {*} id 
   * @param {*} permissionRequired TODO
   * @returns 
   */
  async universeById(user, id, permissionRequired) {
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
  }

  /**
   * 
   * @param {*} user 
   * @param {*} authorId 
   * @returns 
   */
  universesByAuthorId(user, authorId) {
    return api.get.universes(user, { 
      strings: [
        'universeId IN (SELECT universeId FROM authoruniverses as au WHERE au.userId = ? AND au.permissionLevel <> 0)',
      ], values: [
        authorId,
      ] 
    });
  }

  /**
   * 
   * @param {*} user 
   * @param {*} conditions 
   * @returns 
   */
  async universes(user, conditions) {
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
  }
  
  /**
   * 
   * @param {*} user 
   * @param {*} conditions 
   * @returns 
   */
  async items(user, conditions) {
    try {
      const usrQueryString = user ? ` OR (au.userId = ${user.id} AND au.permissionLevel <> 0)` : '';
      const conditionString = conditions ? ` AND ${conditions.strings.join(' AND ')}` : '';
      const queryString = `
        SELECT * FROM items
        WHERE items.universeId IN (
          SELECT au.universeId FROM authoruniverses as au
          INNER JOIN universes ON universes.id = au.universeId 
          WHERE public = 1${usrQueryString}
          GROUP BY au.universeId
        )
        ${conditionString};`;
      const data = await executeQuery(queryString, conditions && conditions.values);
      return [null, data];
    } catch (err) {
      console.error(err);
      return [500, null];
    }
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
    const queryString = `UPDATE sessions SET ? WHERE ${parsedOptions.string.join(' AND ')}`;
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
    const queryString = `DELETE FROM sessions WHERE ${parsedOptions.string.join(' AND ')}`;
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