import { Collection, Document } from 'mongodb';
import _ from 'underscore';
import aggregate from './aggregate';
import config from './config';
import { PaginationResponse } from './utils/query';
import {
  prepareResponse,
  generateSort,
  generateCursorQuery,
  PaginationParams,
} from './utils/query';
import sanitizeParams, { SanitizeParams } from './utils/sanitizeParams';

export interface FindParams extends PaginationParams {
  query?: Document;
  limit?: number;
  fields?: Record<string, number>;
  collation?: Record<string, any> | null;
  overrideFields?: Record<string, number>;
}

const COLLECTION_METHODS = {
  FIND: 'find',
  FIND_AS_CURSOR: 'findAsCursor',
};

export default async function findWithPagination(
  collection: Collection<Document>,
  params: FindParams
): Promise<PaginationResponse<Document>> {
  const removePaginatedFieldInResponse =
    params.fields && !params.fields[params.paginatedField || '_id'];

  let response;
  if (params.sortCaseInsensitive) {
    // For case-insensitive sorting, we need to work with an aggregation:
    response = await aggregate(
      collection,
      Object.assign({}, params, {
        aggregation: params.query ? [{ $match: params.query }] : [],
      })
    );
  } else {
    // Need to repeat `params.paginatedField` default value ('_id') since it's set in 'sanitizeParams()'
    params = _.defaults(await sanitizeParams(collection, params as SanitizeParams), { query: {} });

    const cursorQuery = generateCursorQuery(params);
    const $sort = generateSort(params);

    // Support both the native 'mongodb' driver and 'mongoist'. See:
    // https://www.npmjs.com/package/mongoist#cursor-operations
    const findMethod = (collection as any).findAsCursor
      ? COLLECTION_METHODS.FIND_AS_CURSOR
      : COLLECTION_METHODS.FIND;

    // Required to support native mongodb 3+ and keep the backward compatibility with version 2
    let query;
    if (findMethod === COLLECTION_METHODS.FIND_AS_CURSOR) {
      query = collection[findMethod]({ $and: [cursorQuery, params.query] }, params.fields);
    } else {
      query = collection[findMethod]({ $and: [cursorQuery, params.query] }).project(params.fields);
    }

    /**
     * IMPORTANT
     *
     * If using collation, check the README:
     * https://github.com/mixmaxhq/mongo-cursor-pagination#important-note-regarding-collation
     */
    const isCollationNull = params.collation === null;
    const collation = params.collation || config.COLLATION;
    const collatedQuery = collation && !isCollationNull ? query.collation(collation) : query;
    // Query one more element to see if there's another page.
    const cursor = collatedQuery.sort($sort).limit(params.limit + 1);
    if (params.hint) cursor.hint(params.hint);
    const results = await cursor.toArray();

    response = prepareResponse(results, params);
  }

  // Remove fields that we added to the query (such as paginatedField and _id) that the user didn't ask for.
  if (removePaginatedFieldInResponse) {
    response.results = _.map(response.results, (result) => _.omit(result, params.paginatedField));
  }

  return response;
}
