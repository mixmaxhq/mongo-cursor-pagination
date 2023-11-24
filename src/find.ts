import { defaults } from 'underscore';

import aggregate from './aggregate';
import config from './config';
import {
  prepareResponse,
  generateSort,
  generateCursorQuery,
  filterProjectedFields,
} from './utils/query';
import sanitizeParams from './utils/sanitizeParams';
import { QueryParams, PaginationResponse } from './types';
import { Collection } from 'mongodb';

/**
 * Performs a find() query on a passed-in Mongo collection, using criteria you specify. The results
 * are ordered by the paginatedField.
 *
 * @param {Collection} collection A collection object returned from the MongoDB library's.
 * @param {QueryParams} params
 * @param {object} params.query The find query.
 * @param {Number} params.limit The page size. Must be between 1 and `config.MAX_LIMIT`.
 * @param {object} params.fields Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
 *      The default is to query all fields.
 * @param {String} params.paginatedField The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
          4. Consistent. All values (except undefined and null values) must be of the same type.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 * @param {boolean} params.sortAscending Whether to sort in ascending order by the `paginatedField`.
 * @param {boolean} params.sortCaseInsensitive Whether to ignore case when sorting, in which case `paginatedField`
 * @param {boolean} params.getTotal Whether to fetch the total count for the query results
 *      must be a string property.
 * @param {String} params.next The value to start querying the page.
 * @param {String} params.previous The value to start querying previous page.
 * @param {String} params.after The _id to start querying the page.
 * @param {String} params.before The _id to start querying previous page.
 * @param {String} params.hint An optional index hint to provide to the mongo query
 * @param {object} params.collation An optional collation to provide to the mongo query. E.g. { locale: 'en', strength: 2 }. When null, disables the global collation.
 */
export default async (
  collection: Collection | any,
  params: QueryParams
): Promise<PaginationResponse> => {
  const projectedFields = params.fields;

  let response = {} as PaginationResponse;
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
    params = defaults(await sanitizeParams(collection, params), { query: {} });
    const cursorQuery = generateCursorQuery(params);
    const $sort = generateSort(params);

    // Support both the native 'mongodb' driver and 'mongoist'. See:
    // https://www.npmjs.com/package/mongoist#cursor-operations
    const findMethod = collection.findAsCursor ? 'findAsCursor' : 'find';

    const query = collection[findMethod]()?.project
      ? collection.find({ $and: [cursorQuery, params.query] }).project(params.fields)
      : collection[findMethod]({ $and: [cursorQuery, params.query] }, params.fields);

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
    if (params.getTotal) response.totalCount = await collection.countDocuments(params.query);
  }

  // Remove fields that we added to the query (such as paginatedField and _id) that the user didn't ask for.
  const projectedResults = filterProjectedFields({
    projectedFields,
    results: response.results,
    sortCaseInsensitive: params.sortCaseInsensitive,
  });

  return { ...response, results: projectedResults };
};
