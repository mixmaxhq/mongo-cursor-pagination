import { Query, Schema } from 'mongoose';
import _ = require('underscore');

import find = require('./find');
const search = require('./search');

/**
 * Mongoose plugin
 * @param {Object} schema mongoose schema.
 * @param {Object} options
 * @param {string} options.name name of the function.
 * @param {string} options.searchFnName name of the function.
 */

module.exports = function (schema: Schema, options: Options) {
  /**
   * paginate function
   * @param {PaginationParams} params required parameter
   */
  const findFn = function (params: PaginationParams) {
    if (!this.collection) {
      throw new Error('collection property not found');
    }

    params = _.extend({}, params);

    if (params.query) {
      const model = this.collection.conn.models[this.collection.modelName];

      params.query = new Query().cast(model, params.query);
    }

    return find(this.collection, params);
  };

  /**
   * search function
   * @param {String} searchString String to search on. Required parameter
   * @param {Object} params
   */
  const searchFn = function (searchString: string, params: object) {
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
