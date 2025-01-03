import { Collection, Document, SortDirection, FindOptions } from 'mongodb';
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
    // For case-insensitive sorting, use an aggregation pipeline
    response = await aggregate(
      collection,
      Object.assign({}, params, {
        aggregation: params.query ? [{ $match: params.query }] : [],
      })
    );
  } else {
    // Set default values and sanitize parameters
    params = _.defaults(await sanitizeParams(collection, params as SanitizeParams), { query: {} });

    const cursorQuery = generateCursorQuery(params);
    const $sort: Record<string, SortDirection> = generateSort(params);

    const findMethod =
      'findAsCursor' in collection ? COLLECTION_METHODS.FIND_AS_CURSOR : COLLECTION_METHODS.FIND;

    let query;

    if (findMethod === COLLECTION_METHODS.FIND_AS_CURSOR) {
      query = collection[findMethod](
        { $and: [cursorQuery, params.query] },
        params.fields as FindOptions<Document>
      );
    } else {
      query = collection[findMethod]({ $and: [cursorQuery, params.query] }).project(params.fields);
    }

    const isCollationNull = params.collation === null;
    const collation = params.collation || config.COLLATION;
    const collatedQuery = collation && !isCollationNull ? query.collation(collation) : query;

    // Query one more element to check if there is another page
    const cursor = collatedQuery.sort($sort).limit((params.limit || 0) + 1);
    if (params.hint) cursor.hint(params.hint);

    const results = await cursor.toArray();

    response = prepareResponse(results, params);
  }

  // Remove paginatedField from response if not requested
  if (removePaginatedFieldInResponse) {
    response.results = _.map(response.results, (result) => _.omit(result, params.paginatedField));
  }

  return response;
}
