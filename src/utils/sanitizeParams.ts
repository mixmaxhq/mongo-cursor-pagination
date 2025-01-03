import _ from 'underscore';
import { Collection, Document } from 'mongodb';
import bsonUrlEncoding from './bsonUrlEncoding';
import getPropertyViaDotNotation from './getPropertyViaDotNotation';
import config from '../config';

export interface SanitizeParams {
  previous?: string | [unknown, unknown];
  next?: string | [unknown, unknown];
  after?: string;
  before?: string;
  limit?: number;
  paginatedField?: string;
  sortCaseInsensitive?: boolean;
  fields?: Record<string, number>;
}

export default async function sanitizeParams(
  collection: Collection<Document>,
  params: SanitizeParams
): Promise<SanitizeParams> {
  if (params.previous)
    params.previous = bsonUrlEncoding.decode(params.previous as string) as string;
  if (params.next) params.next = bsonUrlEncoding.decode(params.next as string) as string;

  params = _.defaults(params, {
    limit: config.DEFAULT_LIMIT,
    paginatedField: '_id',
  });

  if (params.limit! < 1) params.limit = 1;
  if (params.limit! > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  // Handle `after` parameter
  if (params.after) {
    if (shouldSecondarySortOnId) {
      const doc = await collection.findOne(
        { _id: params.after },
        { projection: { [params.paginatedField!]: true, _id: false } }
      );
      if (doc) {
        let prop = getPropertyViaDotNotation(params.paginatedField!, doc);
        if (params.sortCaseInsensitive && typeof prop === 'string') {
          prop = prop.toLowerCase();
        }
        params.next = [prop, params.after];
      }
    } else {
      params.next = params.after;
    }
  }

  // Handle `before` parameter
  if (params.before) {
    if (shouldSecondarySortOnId) {
      const doc = await collection.findOne(
        { _id: params.before },
        { projection: { [params.paginatedField!]: true, _id: false } }
      );
      if (doc) {
        let prop = getPropertyViaDotNotation(params.paginatedField!, doc);
        if (params.sortCaseInsensitive && typeof prop === 'string') {
          prop = prop.toLowerCase();
        }
        params.previous = [prop, params.before];
      }
    } else {
      params.previous = params.before;
    }
  }

  // Ensure the query includes the paginatedField
  if (params.fields) {
    params.fields = _.extend(
      {
        _id: 0, // Mongo includes `_id` by default; exclude unless explicitly requested.
      },
      params.fields
    );

    if (!params.fields[params.paginatedField!]) {
      params.fields[params.paginatedField!] = 1;
    }
  }

  return params;
}
