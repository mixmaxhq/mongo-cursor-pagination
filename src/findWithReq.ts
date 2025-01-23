import { Request } from 'express';
import { Collection, Document } from 'mongodb';
import find, { FindParams } from './find';
import sanitizeQuery from './utils/sanitizeQuery';
import { PaginationResponse } from './utils/query';

/**
 * A wrapper around `find()` to implement a basic HTTP API using Express. Allows users to call
 * endpoints with query string parameters like "/list?limit=1&fields=_id,name", which are
 * passed to this function via the Express request object.
 *
 * @param req - An Express request object containing the query parameters:
 *    - `limit`: If a numeric string, passed to `find()` as the limit.
 *    - `next`: If a non-empty string, passed to `find()` as the next cursor.
 *    - `previous`: If a non-empty string, passed to `find()` as the previous cursor.
 *    - `fields`: If a non-empty string, limits fields that are returned. Multiple fields can
 *      be specified as a comma-delimited list.
 * @param collection - A MongoDB collection object.
 * @param params - Additional parameters for `find()`:
 *    - `overrideFields`: Fields to override those from the query string, e.g., `{ _id: 0 }`.
 * @returns The result of the `find()` function.
 */
export default async function findWithReq(
  req: Request,
  collection: Collection<Document>,
  params: FindParams
): Promise<PaginationResponse<Document>> {
  // Sanitize the query string parameters and merge with additional params
  const sanitizedParams = sanitizeQuery(req.query, params);

  // Perform the find operation with the sanitized parameters
  return find(collection, sanitizedParams);
}
