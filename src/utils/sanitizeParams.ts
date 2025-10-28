import _ from 'underscore';
import bsonUrlEncoding from './bsonUrlEncoding';
import getPropertyViaDotNotation from './getPropertyViaDotNotation';
import config from '../config';
import { Encodable } from './bsonUrlEncoding';

export interface SanitizeParams {
  previous?: string | [unknown, unknown] | Encodable;
  next?: string | [unknown, unknown] | Encodable;
  after?: string;
  before?: string;
  limit?: number;
  paginatedField?: string;
  sortCaseInsensitive?: boolean;
  fields?: Record<string, number>;
}

export default async function sanitizeParams(
  collection: any,
  params: SanitizeParams
): Promise<SanitizeParams> {
  if (params.previous) params.previous = bsonUrlEncoding.decode(params.previous as string);
  if (params.next) params.next = bsonUrlEncoding.decode(params.next as string);

  params = _.defaults(params, {
    limit: config.DEFAULT_LIMIT,
    paginatedField: '_id',
  });

  if (params.limit < 1) params.limit = 1;
  if (params.limit > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  // If the paginated field is not _id, then it might have duplicate values in it. This is bad
  // because then we can't exclusively use it for our range queries (that use $lt and $gt). So
  // to fix this, we secondarily sort on _id, which is always unique.
  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  //
  // params.after - overides params.next
  //
  // The 'after' param sets the start position for the next page. This is similar to the
  // 'next' param, with the difference that 'after' takes a plain _id instead of an encoded
  // string of both _id and paginatedField values.
  if (params.after) {
    if (shouldSecondarySortOnId) {
      // Since the primary sort field is not provided by the 'after' pagination cursor we
      // have to look it up when the paginated field is not _id.
      const doc = await collection.findOne(
        { _id: params.after },
        { [params.paginatedField]: true, _id: false }
      );
      if (doc) {
        // Handle usage of dot notation in paginatedField
        let prop = getPropertyViaDotNotation(params.paginatedField, doc);
        if (params.sortCaseInsensitive && typeof prop === 'string') {
          prop = prop.toLowerCase();
        }
        params.next = [prop, params.after];
      }
    } else {
      params.next = params.after;
    }
  }

  //
  // params.before - overides params.previous
  //
  // The 'before' param sets the start position for the previous page. This is similar to the
  // 'previous' param, with the difference that 'before' takes a plain _id instead of an encoded
  // string of both _id and paginatedField values.
  if (params.before) {
    if (shouldSecondarySortOnId) {
      // Since the primary sort field is not provided by the 'before' pagination cursor we
      // have to look it up when the paginated field is not _id.
      const doc = await collection.findOne(
        { _id: params.before },
        { [params.paginatedField]: true, _id: false }
      );
      if (doc) {
        // Handle usage of dot notation in paginatedField
        let prop = getPropertyViaDotNotation(params.paginatedField, doc);
        if (params.sortCaseInsensitive && typeof prop === 'string') {
          prop = prop.toLowerCase();
        }

        params.previous = [prop, params.before];
      }
    } else {
      params.previous = params.before;
    }
  }

  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {
    params.fields = _.extend(
      {
        _id: 0, // Mongo includes this field by default, so don't request it unless the user wants it.
      },
      params.fields
    );

    if (!params.fields[params.paginatedField]) {
      params.fields[params.paginatedField] = 1;
    }

    // When using secondary sort (paginatedField !== '_id'), we need _id for cursor encoding.
    // Cursors are encoded as [paginatedFieldValue, _id] tuples (see encodePaginationTokens in query.ts).
    // Without _id, the cursor would be encoded as a string, breaking pagination on subsequent pages.
    if (shouldSecondarySortOnId && params.fields._id === 0) {
      params.fields._id = 1;
    }
  }

  return params;
}
