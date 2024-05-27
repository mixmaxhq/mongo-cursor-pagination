import { Aggregate, Query, Schema } from "mongoose";
import { extend } from "underscore";

import {
  QueryParams,
  SearchParams,
  Options,
  PaginationResponse,
  QueryParamsMulti,
} from "./types";
import find from "./find";
import search from "./search";
import findMulti from "./findMulti";

declare module "mongoose" {
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
    TSchema = any,
  > {
    paginate(params: QueryParams): Promise<PaginationResponse>;
    paginateMulti(params: QueryParamsMulti): Promise<PaginationResponse>;
    search(
      searchString: string,
      params: SearchParams
    ): Promise<PaginationResponse>;
  }
}

/**
 * Mongoose plugin
 * @param {Schema} schema mongoose schema.
 * @param {Options} options
 */

export default (schema: Schema, options: Options) => {
  /**
   * paginate function
   * @param {QueryParams} params required parameter
   */
  const findFn = async function (
    params: QueryParams
  ): Promise<PaginationResponse> {
    if (!this.collection) {
      throw new Error("collection property not found");
    }

    params = extend({}, params);

    if (params.query) {
      const model = this.collection.conn.models[this.collection.modelName];
      params.query = new Query().cast(model, params.query);
    }

    return find(this.collection, params);
  };

  const findMultiFn = async function (
    params: QueryParamsMulti
  ): Promise<PaginationResponse> {
    if (!this.collection) {
      throw new Error("collection property not found");
    }

    params = extend({}, params);

    if (params.query) {
      const model = this.collection.conn.models[this.collection.modelName];

      if (params.aggregationSearch) {
        //@ts-ignore
        params.query = new Aggregate().append(params.query)._pipeline;
      } else {
        params.query = new Query().cast(model, params.query);
      }
    }

    return findMulti(this.collection, params);
  };

  /**
   * search function
   * @param {String} searchString String to search on. Required parameter
   * @param {SearchParams} params
   */
  const searchFn = async function (
    searchString: string,
    params: SearchParams
  ): Promise<PaginationResponse> {
    if (!this.collection) {
      throw new Error("collection property not found");
    }

    params = extend({}, params);

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

  if (options && options.findMultiFnName) {
    schema.statics[options.findMultiFnName] = findMultiFn;
  } else {
    schema.statics.paginateMulti = findMultiFn;
  }
};
