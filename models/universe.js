const Model = require('./model');

/**
 * Sessions is a class with methods to interact with the sessions table, which
 * stores the information about a session (id, hash, userId).
 * @constructor
 * @augments Model
 */
class Universes extends Model {
  constructor() {
    super('universes');
  }

  /**
   * Gets one record in the table matching specified conditions, and attaches user
   * information if the userId is present on the session object.
   * @param {Object} options - An object where the keys are the column names and the values
   * are the values to be matched.
   * @returns {Promise<Object>} A promise that is fulfilled with the session object
   * or rejected with the error that occured. Note that even if multiple session records
   * match the options, the promise will only be fulfilled with one.
   */
  async get(options) {
    const data = await super.get.call(this, options);
    data.public = data.public.readInt8();
    return data;
  }

  /**
   * Creates a new record in the table.
   * @param {Object} options - An object with key/value pairs, where the keys should match
   * the column names and the values should be of the correct type for that table. See model
   * class definition for additional information about the schema.
   * @returns {Promise<Object>} A promise that is fulfilled with an object
   * containing the results of the query or is rejected with the the error that occurred
   * during the query.
   */
  create(options) {
    return super.create.call(this, {
      ...options,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

module.exports = new Universes();

