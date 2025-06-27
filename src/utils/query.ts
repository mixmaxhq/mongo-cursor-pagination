import objectPath from "object-path";
import { omit, pick, uniq } from "lodash";

import {
  AggregateParams,
  QueryParams,
  PaginationResponse,
  PaginatedField,
  QueryParamsMulti,
  AggregateParamsMulti,
} from "../types";

import { encode } from "./bsonUrlEncoding";

function buildCursor(
  doc: { _id: any },
  params: QueryParams | AggregateParams,
  shouldSecondarySortOnId: boolean
): string {
  const paginatedFieldValue = (() => {
    const { paginatedField, sortCaseInsensitive } = params;
    const value = objectPath.get(doc, paginatedField);
    return sortCaseInsensitive && value?.toLowerCase
      ? value.toLowerCase()
      : value;
  })();

  const rawCursor = shouldSecondarySortOnId
    ? [paginatedFieldValue, doc._id]
    : paginatedFieldValue; // which may actually be the document_id anyways

  return encode(rawCursor);
}

function buildCursorMulti(
  doc: { _id: any },
  params: QueryParamsMulti | AggregateParamsMulti,
  shouldSecondarySortOnId: boolean
): string {
  const { paginatedFields } = params;

  const paginatedFieldValues = paginatedFields.reduce((acc, curr) => {
    const value = objectPath.get(doc, curr.paginatedField);
    if (curr.sortCaseInsensitive && value?.toLowerCase) {
      acc[curr.paginatedField] = value.toLowerCase();
      return acc;
    }
    acc[curr.paginatedField] = value;
    return acc;
  }, {});

  const rawCursor = shouldSecondarySortOnId
    ? { ...paginatedFieldValues, _id: doc._id }
    : paginatedFieldValues; // which may actually be the document_id anyways

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
  response: PaginationResponse,
  multi = false
): void {
  const shouldSecondarySortOnId = params.paginatedField !== "_id";

  if (response.previous) {
    response.previous = multi
      ? buildCursorMulti(response.previous, params, shouldSecondarySortOnId)
      : buildCursor(response.previous, params, shouldSecondarySortOnId);
  }
  if (response.next) {
    response.next = multi
      ? buildCursorMulti(response.next, params, shouldSecondarySortOnId)
      : buildCursor(response.next, params, shouldSecondarySortOnId);
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
  params: QueryParams | AggregateParams,
  multi = false
): PaginationResponse {
  const hasMore = results.length > params.limit;
  const shouldSecondarySortOnId = params.paginatedField !== "_id";

  // Remove the extra element that we added to 'peek' to see if there were more entries.
  if (hasMore) results.pop();

  const hasPrevious = !!params.next || !!(params.previous && hasMore);
  const hasNext = !!params.previous || hasMore;

  results = results.map((result: any) => ({
    ...result,
    _cursor: multi
      ? buildCursorMulti(result, params, shouldSecondarySortOnId)
      : buildCursor(result, params, shouldSecondarySortOnId),
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

  encodePaginationTokens(params, response, multi);

  return response;
}

export type SearchArgs = PaginatedField & Pick<QueryParams, "previous">;

/**
 * Generates a `$sort` object given the parameters
 *
 * @param {QueryParams | AggregateParams} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a sort object
 */
export function generateSort(params: SearchArgs): Record<string, number> {
  const sortAsc =
    (!params.sortAscending && params.previous) ||
    (params.sortAscending && !params.previous);
  const sortDir = sortAsc ? 1 : -1;

  if (params.paginatedField == "_id") return { _id: sortDir };

  const field = params.sortCaseInsensitive
    ? `__lower_case_value_${params.paginatedField}`
    : params.paginatedField;
  return { [field]: sortDir };
}

export function generateSorts(params: QueryParamsMulti) {
  const sortArgs = params.paginatedFields.map(pf => ({
    ...pf,
    previous: params.previous,
  }));

  return Object.assign({}, ...sortArgs.map(f => generateSort(f)));
}

/**
 * Generates a cursor query that provides the offset capabilities
 *
 * @param {Object} params The params originally passed to `find` or `aggregate`
 *
 * @return {Object} a cursor offset query
 */
export function generateCursorQuery(
  params: QueryParams | AggregateParams
): object {
  if (!params.next && !params.previous) return {};

  const sortAsc =
    (!params.sortAscending && params.previous) ||
    (params.sortAscending && !params.previous);

  // a `next` cursor will have precedence over a `previous` cursor.
  const cursor = (params.next || params.previous) as any;

  if (params.paginatedField == "_id")
    return { _id: sortAsc ? { $gt: cursor } : { $lt: cursor } };

  const field = params.sortCaseInsensitive
    ? "__lower_case_value" // lc value of the paginatedField (via $addFields + $toLower)
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

type BigOrRow = Record<string, Record<"$gt" | "$lt" | "$eq", any>>;

export function generateCursorQueryMulti(params: QueryParamsMulti) {
  if (!params.next && !params.previous) return {};

  const cursor = (params.next || params.previous) as any;
  const idValue = cursor._id;

  /**
   * ends up looking like this:
   * ```
   * [
   *   { firstName: { $gt: "george" } },
   *   { firstName: { $eq: "george" }, { lastName: { $gt: "Costanza" } },
   *   { firstName: { $eq: "george" }, { lastName: { $eq: "Costanza" }, title: { $gt: "Mr" } }
   * ]
   * ```
   */
  const bigOr: BigOrRow[] = [];

  const onlyId =
    params.paginatedFields.length === 1 &&
    params.paginatedFields[0].paginatedField === "_id";

  if (onlyId) {
    return getOrNextLine({
      prev: undefined,
      field: "_id",
      sortAsc: params.paginatedFields[0].sortAscending,
      value: idValue ?? cursor,
    });
  }

  for (let i = 0; i < params.paginatedFields.length; i++) {
    const pf = params.paginatedFields[i];

    const field = pf.sortCaseInsensitive
      ? `__lower_case_value_${pf.paginatedField}` // lc value of the paginatedField (via $addFields + $toLower)
      : pf.paginatedField;

    const sortAsc = ((!pf.sortAscending && params.previous) ||
      (pf.sortAscending && !params.previous)) as boolean;

    const paginatedFieldValue = cursor[pf.paginatedField];
    const prev = bigOr[bigOr.length - 1];

    if (paginatedFieldValue) {
      const newFields = getOrNextLine({
        prev,
        field,
        sortAsc,
        value: paginatedFieldValue,
      });
      bigOr.push(newFields);
    } else {
      const notNullNorUndefined = { [field]: { $ne: null } };
      const nullOrUndefined = { [field]: null };

      const previousFields = (() => {
        if (!prev) {
          return {};
        }
        return Object.assign(
          {},
          ...Object.entries(prev).map(([k, v]) =>
            convert$lt$gtFieldTo$eq({ [k]: v })
          )
        );
      })();

      if (sortAsc) {
        bigOr.push({ ...previousFields, ...notNullNorUndefined });
      } else {
        bigOr.push({ ...previousFields, ...nullOrUndefined });
      }
    }
  }

  return { $or: bigOr };
}

function $gt$lt(asc: boolean) {
  return asc ? ("$gt" as const) : ("$lt" as const);
}

/**
 * Takes the previous entries and adds a new one where
 * all of the operators are $eq except the latest
 *
 * i.e.
 * ```
 *  //before
 *  { firstName: { $gt: "george" } }
 *  // after
 *  { firstName: { $eq: "george" }, { lastName: {$gt: "Costanza" } }
 * ```
 */
function getOrNextLine({
  prev,
  field,
  sortAsc,
  value,
}: {
  prev?: BigOrRow;
  field: string;
  sortAsc: boolean;
  value: string;
}): BigOrRow {
  if (!prev) {
    return { [field]: { [$gt$lt(sortAsc)]: value } } as BigOrRow;
  }
  const previousFields = Object.assign(
    {},
    ...Object.entries(prev).map(([k, v]) => convert$lt$gtFieldTo$eq({ [k]: v }))
  );
  return { ...previousFields, [field]: { [$gt$lt(sortAsc)]: value } };
}

/**
 * transforms
 * ```
 * { firstName: { $gt: "george" }
 * ```
 *  to
 * ```
 * { firstName: { $eq: "george" }
 * ```
 */
function convert$lt$gtFieldTo$eq(
  field: Record<string, Record<"$lt" | "$gt", any>>
): Record<string, Record<"$eq", any>> {
  const [key, value] = Object.entries(field)[0];
  const fieldValue = value ? Object.values(value)[0]: ''; 
  return { [key]: { $eq: fieldValue } };
}

/**
 * response results can have additional fields that were not requested by user (for example, the
 * fields required to sort and paginate). If projected fields are nominated, return only these.
 */
export function filterProjectedFields({
  projectedFields,
  results,
  sortCaseInsensitive,
}) {
  //
  if (sortCaseInsensitive)
    results = results.map(result => omit(result, "__lower_case_value"));

  const requestedFields = projectedFields
    ? Object.keys(projectedFields).filter(
        key => projectedFields[key] === 1 || projectedFields[key] === true
      )
    : [];

  return requestedFields?.length
    ? results.map(result => pick(result, uniq([...requestedFields, "_cursor"])))
    : results; // else if no projection, return full results
}
