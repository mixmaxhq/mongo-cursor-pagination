import objectPath from 'object-path';
import bsonUrlEncoding from './bsonUrlEncoding';

export type PaginationToken = { _id: string; [key: string]: any } | string | [any, unknown];

export type PaginationParams = {
  paginatedField?: string;
  sortCaseInsensitive?: boolean;
  sortAscending?: boolean;
  previous?: PaginationToken;
  next?: PaginationToken;
  limit?: number;
  after?: PaginationToken;
  hint?: string;
  before?: string;
};

export type PaginationResponse<T> = {
  results: T[];
  previous: PaginationToken; // Updated to reflect a more specific type
  hasPrevious: boolean;
  next: PaginationToken; // Updated to reflect a more specific type
  hasNext: boolean;
};

/**
 * Return true only for "simple" POJOs: `{}` created by object literals or
 * `Object.create(null)`.  Arrays, class instances, Dates, BSON objects, etc.
 * will return false.
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}



/**
 * Helper function to encode pagination tokens.
 *
 * NOTE: this function modifies the passed-in `response` argument directly.
 *
 * @param      {Object}  params
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
  params: PaginationParams,
  response: PaginationResponse<any>
): void {
  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  // ----- previous ----------------------------------------------------------
  if (response.previous && isPlainObject(response.previous)) {
    let previousPaginatedField = objectPath.get(response.previous, params.paginatedField);
    if (params.sortCaseInsensitive) {
      previousPaginatedField = previousPaginatedField?.toLowerCase?.() ?? '';
    }

    response.previous = shouldSecondarySortOnId && '_id' in response.previous
      ? bsonUrlEncoding.encode([previousPaginatedField, response.previous._id])
      : bsonUrlEncoding.encode(previousPaginatedField);
  }

  // ----- next --------------------------------------------------------------
  if (response.next && isPlainObject(response.next)) {
    let nextPaginatedField = objectPath.get(response.next, params.paginatedField);
    if (params.sortCaseInsensitive) {
      nextPaginatedField = nextPaginatedField?.toLowerCase?.() ?? '';
    }

    response.next = shouldSecondarySortOnId && '_id' in response.next
      ? bsonUrlEncoding.encode([nextPaginatedField, response.next._id])
      : bsonUrlEncoding.encode(nextPaginatedField);
  }
}

/**
 * Parses the raw results from a find or aggregate query and generates a response object that
 * contain the various pagination properties
 *
 * @param {Object[]} results the results from a query
 * @param {Object} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} The object containing pagination properties
 */
function prepareResponse(results: any[], params: any): any {
  const hasMore = results.length > params.limit;
  // Remove the extra element that we added to 'peek' to see if there were more entries.
  if (hasMore) results.pop();

  const hasPrevious = !!params.next || !!(params.previous && hasMore);
  const hasNext = !!params.previous || hasMore;

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
}

/**
 * Generates a `$sort` object given the parameters
 *
 * @param {Object} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a sort object
 */
function generateSort(params: any): any {
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
}

function /**
 * Generates a cursor query that provides the offset capabilities
 *
 * @param {Object} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a cursor offset query
 */
generateCursorQuery(params: any): any {
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
}

export { encodePaginationTokens, prepareResponse, generateSort, generateCursorQuery };
