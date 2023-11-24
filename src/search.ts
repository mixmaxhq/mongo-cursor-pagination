import { Collection } from 'mongodb';
import { defaults, extend, last } from 'underscore';
import config from './config';
import { PaginationResponse, SearchParams } from './types';
import { decode, encode } from './utils/bsonUrlEncoding';

/**
 * Performs a search query on a Mongo collection and pages the results. This is different from
 * find() in that the results are ordered by their relevancy, and as such, it does not take
 * a paginatedField parameter. Note that this is less performant than find() because it must
 * perform the full search on each call to this function.
 *
 * @param {Collection} collection A collection object returned from the MongoDB library's. This MUST have a Mongo
 *    $text index on it.
 *    See https://docs.mongodb.com/manual/core/index-text/.
 * @param {String} searchString String to search on.
 * @param {QueryParams} params
 * @param {object} params.query The find query.
 * @param {Number} params.limit The page size. Must be between 1 and `config.MAX_LIMIT`.
 * @param {object} params.fields Fields to query in the Mongo object format, e.g. {title :1}.
 *      The default is to query ONLY _id (note this is a difference from `find()`).
 * @param {String} params.next The value to start querying the page. Defaults to start at the beginning of
 *      the results.
 */
export default async (
  collection: Collection | any,
  searchString: string,
  params: SearchParams
): Promise<PaginationResponse> => {
  if (typeof params.limit === 'string') params.limit = parseInt(params.limit, 10);
  if (params.next) params.next = decode(params.next as string);

  params = defaults(params, {
    query: {},
    limit: config.MAX_LIMIT,
  });

  if (params.limit < 1) params.limit = 1;
  if (params.limit > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  // We must perform an aggregate query since Mongo can't query a range when using $text search.

  const aggregate: Array<object> = [
    {
      $match: extend({}, params.query, {
        $text: {
          $search: searchString,
        },
      }),
    },
    {
      $project: extend({}, params.fields, {
        _id: 1,
        score: {
          $meta: 'textScore',
        },
      }),
    },
    {
      $sort: {
        score: {
          $meta: 'textScore',
        },
        _id: -1,
      },
    },
  ];

  if (params.next) {
    aggregate.push({
      $match: {
        $or: [
          {
            score: {
              $lt: params.next[0],
            },
          },
          {
            score: {
              $eq: params.next[0],
            },
            _id: {
              $lt: params.next[1],
            },
          },
        ],
      },
    });
  }

  aggregate.push({
    $limit: params.limit,
  });

  let response: { results: any; next?: any };

  // Support both the native 'mongodb' driver and 'mongoist'. See:
  // https://www.npmjs.com/package/mongoist#cursor-operations
  const aggregateMethod = collection.aggregateAsCursor ? 'aggregateAsCursor' : 'aggregate';

  const results = await collection[aggregateMethod](aggregate).toArray();

  const fullPageOfResults = results.length === params.limit;
  if (fullPageOfResults) {
    response = {
      results,
      next: encode([last(results).score, last(results)._id]),
    };
  } else {
    response = {
      results,
    };
  }
  return response;
};
