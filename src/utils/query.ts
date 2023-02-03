import objectPath from 'object-path';
import { omit, pick, uniq } from 'lodash';

import { AggregateParams, QueryParams, PaginationResponse } from '../types';

import { encode } from './bsonUrlEncoding';

function buildCursor(
  doc: { _id: any },
  params: QueryParams | AggregateParams,
  shouldSecondarySortOnId: boolean
): string {
  const pagiginatedFieldValue = (() => {
    const { paginatedField, sortCaseInsensitive } = params;
    const value = objectPath.get(doc, paginatedField);
    return sortCaseInsensitive && value?.toLowerCase ? value.toLowerCase() : value;
  })();

  const rawCursor = shouldSecondarySortOnId
    ? [pagiginatedFieldValue, doc._id]
    : pagiginatedFieldValue; // which may actually be the document_id anyways

  return encode(rawCursor);
}

/**
 * Helper function to encode pagination tokens.
 *
 * NOTE: this function modifies the passed-in `response` argument directly.
 * @param {QueryParams | AggregateParams} params
 * @param {Object} response The response
 * @returns void
 */
export function encodePaginationTokens(
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

/**
 * Parses the raw results from a find or aggregate query and generates a response object that
 * contain the various pagination properties
 *
 * @param {Object[]} results the results from a query
 * @param {QueryParams | AggregateParams} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} The object containing pagination properties
 */
export function prepareResponse(
  results: any[],
  params: QueryParams | AggregateParams
): PaginationResponse {
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
}

/**
 * Generates a `$sort` object given the parameters
 *
 * @param {QueryParams | AggregateParams} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a sort object
 */
export function generateSort(params: QueryParams | AggregateParams): object {
  const sortAsc =
    (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);
  const sortDir = sortAsc ? 1 : -1;

  if (params.paginatedField == '_id') return { _id: sortDir };

  const field = params.sortCaseInsensitive ? '__lower_case_value' : params.paginatedField;
  return { [field]: sortDir, _id: sortDir };
}

/**
 * Generates a cursor query that provides the offset capabilities
 *
 * @param {Object} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a cursor offset query
 */
export function generateCursorQuery(params: QueryParams | AggregateParams): object {
  if (!params.next && !params.previous) return {};

  const sortAsc =
    (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);

  // a `next` cursor will have precedence over a `previous` cursor.
  const cursor = (params.next || params.previous) as any;

  if (params.paginatedField == '_id') return { _id: sortAsc ? { $gt: cursor } : { $lt: cursor } };

  const field = params.sortCaseInsensitive
    ? '__lower_case_value' // lc value of the paginatedField (via $addFields + $toLower)
    : params.paginatedField;

  const notNullNorUndefined = { [field]: { $ne: null } };
  const nullOrUndefined = { [field]: null };
  const [paginatedFieldValue, idValue] = cursor;

  // mongo does not distinguish a sort order difference between null or undefined
  // for sorting purposes, and thus secondarily sorts by _id
  if (paginatedFieldValue === null || paginatedFieldValue === undefined) {
    return sortAsc
      ? {
          $or: [
            notNullNorUndefined, // still have all the non-null, non-undefined values
            { ...nullOrUndefined, _id: { $gt: idValue } },
          ], // & sort remaining using the _id as secondary field
        }
      : // if sorting descending value, then all other values must be null || undefined
        { $or: [{ ...nullOrUndefined, _id: { $lt: idValue } }] };
  }

  // else if value is not null | undefined
  return sortAsc
    ? {
        $or: [
          { [field]: { $gt: paginatedFieldValue } },
          { [field]: { $eq: paginatedFieldValue }, _id: { $gt: idValue } },
        ],
      }
    : {
        $or: [
          nullOrUndefined, // in descending order, will still have null && undefined values remaining
          { [field]: { $lt: paginatedFieldValue } },
          { [field]: { $eq: paginatedFieldValue }, _id: { $lt: idValue } },
        ],
      };
}

/**
 * response results can have additional fields that were not requested by user (for example, the
 * fields required to sort and paginate). If projected fields are nominated, return only these.
 */
export function filterProjectedFields({ projectedFields, results, sortCaseInsensitive }) {
  //
  if (sortCaseInsensitive) results = results.map((result) => omit(result, '__lower_case_value'));

  const requestedFields = projectedFields
    ? Object.keys(projectedFields).filter(
        (key) => projectedFields[key] === 1 || projectedFields[key] === true
      )
    : [];

  return requestedFields?.length
    ? results.map((result) => pick(result, uniq([...requestedFields, '_cursor'])))
    : results; // else if no projection, return full results
}
