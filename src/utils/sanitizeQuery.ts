import _ from 'underscore';
import resolveFields from './resolveFields';
import { FindParams } from '../find';

export interface QueryObject {
  limit?: string;
  next?: string;
  previous?: string;
  fields?: string | string[];
  [key: string]: any;
}

/**
 * Normalize the given query parameter to an array, supporting both `param=a,b` and `param[]=a&param[]=b`.
 *
 * @param query - The parsed query object containing the given parameter.
 * @param param - The parameter to normalize.
 * @returns The normalized array from the given query parameter.
 * @throws {TypeError} When the query parameter isn't a string, an empty value, or an array of strings.
 */
function normalizeQueryArray(query: QueryObject, param: string): string[] {
  const value = query[param];
  if (Array.isArray(value)) {
    for (const v of value) {
      if (!_.isString(v)) {
        throw new TypeError(`expected string array or comma-separated string for ${param}`);
      }
    }
    return value;
  }
  if (_.isEmpty(value)) {
    return [];
  }
  if (_.isString(value)) {
    return value.split(',');
  }
  throw new TypeError(`expected string array or comma-separated string for ${param}`);
}

/**
 * Sanitizes a `query` object received and merges its changes to an optional `params` object.
 *
 * @param query - The parsed query object with various parameters (limit, next, previous, fields).
 * @param params - The parameters object to merge and sanitize the query into.
 * @returns The sanitized and merged `params` object.
 */
export default function sanitizeQuery(query: QueryObject, params: FindParams = {}): FindParams {
  if (!_.isEmpty(query.limit)) {
    const limit = parseInt(query.limit, 10);
    // Don't let the user specify a higher limit than `params.limit`, if defined.
    if (!isNaN(limit) && (!params.limit || params.limit > limit)) {
      params.limit = limit;
    }
  }

  if (!_.isEmpty(query.next)) {
    params.next = query.next;
  }

  if (!_.isEmpty(query.previous)) {
    params.previous = query.previous;
  }

  // Don't trust fields passed in the query string; whitelist them against the fields defined in parameters.
  const fields = resolveFields(
    normalizeQueryArray(query, 'fields'),
    params.fields,
    params.overrideFields
  );

  if (fields === null) {
    throw new TypeError('no valid fields provided');
  }

  // Set `fields` to undefined if it's empty to avoid adding `_id: 0` in MongoDB find queries.
  params.fields = _.isEmpty(fields) ? undefined : fields;

  return params;
}
