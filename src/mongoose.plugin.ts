import { Query, Schema } from 'mongoose';
import _ from 'underscore';

import { QueryParams, SearchParams, Options, PaginationResponse } from './types';
import find from './find';
import search from './search';

declare module 'mongoose' {
  interface Model<
    TRawDocType,
    TQueryHelpers = {},
    TInstanceMethods = {},
    TVirtuals = {},
    THydratedDocumentType = HydratedDocument<
      TRawDocType,
      TVirtuals & TInstanceMethods,
      TQueryHelpers
    >,
    TSchema = any
  > {
    paginate(params: QueryParams): Promise<PaginationResponse>;
    search(searchString: string, params: SearchParams): Promise<PaginationResponse>;
  }
}

/**
 * Mongoose plugin
 * @param {Object} schema mongoose schema.
 * @param {Object} options
 * @param {string} options.name name of the function.
 * @param {string} options.searchFnName name of the function.
 */

export default (schema: Schema, options: Options) => {
  /**
   * paginate function
   * @param {QueryParams} params required parameter
   */
  const findFn = async function (params: QueryParams): Promise<PaginationResponse> {
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
  const searchFn = async function (
    searchString: string,
    params: SearchParams
  ): Promise<PaginationResponse> {
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
