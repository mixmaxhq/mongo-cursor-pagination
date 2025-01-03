import objectPath from 'object-path';
import bsonUrlEncoding from './bsonUrlEncoding';

export type PaginationParams = {
  paginatedField?: string;
  sortCaseInsensitive?: boolean;
  sortAscending?: boolean;
  previous?: string | [unknown, unknown];
  next?: string | [unknown, unknown];
  limit?: number;
  after?: string | [unknown, unknown];
  hint?: string;
  before?: string;
};

export type PaginationResponse<T> = {
  results: T[];
  previous: string | null;
  hasPrevious: boolean;
  next: string | null;
  hasNext: boolean;
};

type SortObject = Record<string, 1 | -1>;

type CursorQuery = Record<string, any>;

/**
 * Helper function to encode pagination tokens.
 *
 * NOTE: this function modifies the passed-in `response` argument directly.
 *
 * @param params - Pagination parameters
 * @param response - The response object to modify
 */
export function encodePaginationTokens<T>(
  params: PaginationParams,
  response: PaginationResponse<T>,
  previous: T | null,
  next: T | null
): void {
  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  if (previous) {
    let previousPaginatedField = objectPath.get(previous, params.paginatedField);
    if (params.sortCaseInsensitive) {
      previousPaginatedField = previousPaginatedField?.toLowerCase?.() ?? '';
    }
    response.previous = shouldSecondarySortOnId
      ? bsonUrlEncoding.encode([previousPaginatedField, (previous as any)._id])
      : bsonUrlEncoding.encode(previousPaginatedField);
  }

  if (next) {
    let nextPaginatedField = objectPath.get(next, params.paginatedField);
    if (params.sortCaseInsensitive) {
      nextPaginatedField = nextPaginatedField?.toLowerCase?.() ?? '';
    }
    response.next = shouldSecondarySortOnId
      ? bsonUrlEncoding.encode([nextPaginatedField, (next as any)._id])
      : bsonUrlEncoding.encode(nextPaginatedField);
  }
}

/**
 * Parses the raw results from a find or aggregate query and generates a response object that
 * contains various pagination properties.
 *
 * @param results - The results from a query
 * @param params - The parameters originally passed to `find` or `aggregate`
 * @returns The object containing pagination properties
 */
export function prepareResponse<T>(results: T[], params: PaginationParams): PaginationResponse<T> {
  const hasMore = results.length > params.limit;

  if (hasMore) results.pop();

  const hasPrevious = !!params.next || !!(params.previous && hasMore);
  const hasNext = !!params.previous || hasMore;

  if (params.previous) results = results.reverse();

  const response: PaginationResponse<T> = {
    results,
    hasPrevious,
    hasNext,
    previous: null,
    next: null,
  };

  const previous = results[0] || null;
  const next = results[results.length - 1] || null;

  encodePaginationTokens(params, response, previous, next);

  return response;
}

/**
 * Generates a `$sort` object given the parameters.
 *
 * @param params - The parameters originally passed to `find` or `aggregate`
 * @returns A sort object
 */
export function generateSort(params: PaginationParams): SortObject {
  const sortAsc =
    (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);
  const sortDir = sortAsc ? 1 : -1;

  if (params.paginatedField === '_id') {
    return { _id: sortDir };
  } else {
    const field = params.sortCaseInsensitive ? '__lc' : params.paginatedField;
    return { [field]: sortDir, _id: sortDir };
  }
}

/**
 * Generates a cursor query that provides the offset capabilities.
 *
 * @param params - The parameters originally passed to `find` or `aggregate`
 * @returns A cursor offset query
 */
export function generateCursorQuery(params: PaginationParams): CursorQuery {
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

export default {
  prepareResponse,
  encodePaginationTokens,
  generateSort,
  generateCursorQuery,
};
