import { Collection, Document } from 'mongodb';
import _ from 'underscore';
import config from './config';
import bsonUrlEncoding, { Encodable } from './utils/bsonUrlEncoding';

export interface SearchParams {
  query?: Record<string, any>;
  limit?: number;
  fields?: Record<string, number>;
  next?: Encodable;
}

export interface SearchResponse<T = Document> {
  results: T[];
  next?: string;
  previous?: string;
}

/**
 * Performs a search query on a Mongo collection and pages the results. This is different from
 * find() in that the results are ordered by their relevancy, and as such, it does not take
 * a paginatedField parameter. Note that this is less performant than find() because it must
 * perform the full search on each call to this function.
 * @param collection - A MongoDB collection object. This MUST have a Mongo $text index.
 * @param searchString - The string to search for.
 * @param params - Search parameters:
 *    - `query`: Additional query filters.
 *    - `limit`: Number of results per page (1 to `config.MAX_LIMIT`).
 *    - `fields`: Fields to include in the results.
 *    - `next`: Cursor to continue pagination.
 * @returns A paginated response containing results and a cursor for the next page.
 */
export default async function search<T = Document>(
  collection: Collection<T>,
  searchString: string,
  params: SearchParams
): Promise<SearchResponse<T>> {
  if (params.next) {
    params.next = bsonUrlEncoding.decode(params.next as string);
  }

  params = _.defaults(params, {
    query: {},
    limit: config.MAX_LIMIT,
  });

  if (params.limit! < 1) params.limit = 1;
  if (params.limit! > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  const aggregatePipeline: Document[] = [
    {
      $match: {
        ...params.query,
        $text: { $search: searchString },
      },
    },
    {
      $project: {
        ...params.fields,
        _id: 1,
        score: { $meta: 'textScore' },
      },
    },
    {
      $sort: {
        score: { $meta: 'textScore' },
        _id: -1,
      },
    },
  ];

  if (params.next) {
    aggregatePipeline.push({
      $match: {
        $or: [
          { score: { $lt: params.next[0] } },
          { score: { $eq: params.next[0] }, _id: { $lt: params.next[1] } },
        ],
      },
    });
  }

  aggregatePipeline.push({
    $limit: params.limit!,
  });

  const aggregateMethod = 'aggregateAsCursor' in collection ? 'aggregateAsCursor' : 'aggregate';
  const results = await collection[aggregateMethod](aggregatePipeline).toArray();

  const fullPageOfResults = results.length === params.limit;
  const response: SearchResponse<T> = {
    results,
  };

  if (fullPageOfResults) {
    const lastResult = _.last(results);
    if (lastResult) {
      response.next = bsonUrlEncoding.encode([lastResult.score, lastResult._id]);
    }
  }

  return response;
}
