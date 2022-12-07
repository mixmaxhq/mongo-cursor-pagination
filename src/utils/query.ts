import { AggregateParams } from '../types/AggregateParams';

import objectPath from 'object-path';
import { encode, decode } from './bsonUrlEncoding';

function buildCursor(
  doc: { _id: any },
  params: QueryParams | AggregateParams,
  shouldSecondarySortOnId: boolean
): string {
  let nextPaginatedField = objectPath.get(doc, params.paginatedField);

  if (params.sortCaseInsensitive) {
    nextPaginatedField = nextPaginatedField?.toLowerCase?.() ?? '';
  }

  const data = shouldSecondarySortOnId ? [nextPaginatedField, doc._id] : nextPaginatedField;

  return encode(data);
}

/**
 * Helper function to encode pagination tokens.
 *
 * NOTE: this function modifies the passed-in `response` argument directly.
 *
 * @param      {QueryParams | AggregateParams}  params
 *   @param      {String}  paginatedField
 *   @param      {boolean} sortCaseInsensitive
 *
 * @param      {Object}  response  The response
 *   @param      {String?}  previous
 *   @param      {String?}  next
 *
 * @returns void
 */
function encodePaginationTokens(
  params: QueryParams | AggregateParams,
  response: PaginationResponse
): void {
  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  if (response.previous) {
    response.previous = buildCursor(response.previous, params, shouldSecondarySortOnId);
  }
  if (response.next) {
    response.next = buildCursor(response.next, params, shouldSecondarySortOnId);
  }
}

export default {
  /**
   * Parses the raw results from a find or aggregate query and generates a response object that
   * contain the various pagination properties
   *
   * @param {Object[]} results the results from a query
   * @param {QueryParams | AggregateParams} params The params originally passed to `find` or `aggregate`
   *
   * @return {Object} The object containing pagination properties
   */
  prepareResponse(results: any[], params: QueryParams | AggregateParams): PaginationResponse {
    const hasMore = results.length > params.limit;
    const shouldSecondarySortOnId = params.paginatedField !== '_id';

    // Remove the extra element that we added to 'peek' to see if there were more entries.
    if (hasMore) results.pop();

    const hasPrevious = !!params.next || !!(params.previous && hasMore);
    const hasNext = !!params.previous || hasMore;

    results = results.map((result: any) => ({
      ...result,
      _cursor: buildCursor(result, params, shouldSecondarySortOnId),
    }));

    // If we sorted reverse to get the previous page, correct the sort order.
    if (params.previous) results = results.reverse();

    const response = {
      results,
      previous: results[0],
      hasPrevious,
      next: results[results.length - 1],
      hasNext,
    };

    encodePaginationTokens(params, response);

    return response;
  },

  encodePaginationTokens,

  /**
   * Generates a `$sort` object given the parameters
   *
   * @param {QueryParams | AggregateParams} params The params originally passed to `find` or `aggregate`
   *
   * @return {Object} a sort object
   */
  generateSort(params: QueryParams | AggregateParams): object {
    const sortAsc =
      (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);
    const sortDir = sortAsc ? 1 : -1;

    if (params.paginatedField == '_id') {
      return {
        _id: sortDir,
      };
    } else {
      const field = params.sortCaseInsensitive ? '__lc' : params.paginatedField;
      return {
        [field]: sortDir,
        _id: sortDir,
      };
    }
  },

  /**
   * Generates a cursor query that provides the offset capabilities
   *
   * @param {Object} params The params originally passed to `find` or `aggregate`
   *
   * @return {Object} a cursor offset query
   */
  generateCursorQuery(params: QueryParams | AggregateParams): object {
    if (!params.next && !params.previous) return {};

    const sortAsc =
      (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);

    // a `next` cursor will have precedence over a `previous` cursor.
    const op = params.next || params.previous;

    if (params.paginatedField == '_id') {
      if (sortAsc) {
        return { _id: { $gt: op } };
      } else {
        return { _id: { $lt: op } };
      }
    } else {
      const field = params.sortCaseInsensitive ? '__lc' : params.paginatedField;

      const notUndefined = { [field]: { $exists: true } };
      const onlyUndefs = { [field]: { $exists: false } };
      const notNullNorUndefined = { [field]: { $ne: null } };
      const nullOrUndefined = { [field]: null };
      const onlyNulls = { $and: [{ [field]: { $exists: true } }, { [field]: null }] };

      const [paginatedFieldValue, idValue] = op;
      switch (paginatedFieldValue) {
        case null:
          if (sortAsc) {
            return {
              $or: [
                notNullNorUndefined,
                {
                  ...onlyNulls,
                  _id: { $gt: idValue },
                },
              ],
            };
          } else {
            return {
              $or: [
                onlyUndefs,
                {
                  ...onlyNulls,
                  _id: { $lt: idValue },
                },
              ],
            };
          }
        case undefined:
          if (sortAsc) {
            return {
              $or: [
                notUndefined,
                {
                  ...onlyUndefs,
                  _id: { $gt: idValue },
                },
              ],
            };
          } else {
            return {
              ...onlyUndefs,
              _id: { $lt: idValue },
            };
          }
        default:
          if (sortAsc) {
            return {
              $or: [
                { [field]: { $gt: paginatedFieldValue } },
                {
                  [field]: { $eq: paginatedFieldValue },
                  _id: { $gt: idValue },
                },
              ],
            };
          } else {
            return {
              $or: [
                { [field]: { $lt: paginatedFieldValue } },
                nullOrUndefined,
                {
                  [field]: { $eq: paginatedFieldValue },
                  _id: { $lt: idValue },
                },
              ],
            };
          }
      }
    }
  },
};
