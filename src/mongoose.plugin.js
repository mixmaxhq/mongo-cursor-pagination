const find = require('./find');
const search = require('./search');
const _ = require('underscore');

/**
 * Mongoose plugin
 * @param {Object} schema mongoose schema.
 * @param {Object} options
 * @param {string} options.name name of the function.
 * @param {string} options.searchFnName name of the function.
 */

module.exports = function(schema, options) {
  /**
   * paginate function
   * @param {Object} params required parameter
   */
  const findFn = function(params) {
    if (!this.collection) {
      throw new Error('collection property not found');
    }

    params = _.extend({}, params);

    return find(this.collection, params);
  };

  /**
   * search function
   * @param {String} searchString String to search on. Required parameter
   * @param {Object} params
   */
  const searchFn = function(searchString, params) {
    if (!this.collection) {
      throw new Error('collection property not found');
    }

    params = _.extend({}, params);

    return search(this.collection, searchString, params);
  };

  if (options && options.name) {
    schema.statics[options.name] = findFn;
  } else {
    schema.statics.paginate = findFn;
  }

  if (options && options.searchFnName) {
    schema.statics[options.searchFnName] = searchFn;
  } else {
    schema.statics.search = searchFn;
  }
};
