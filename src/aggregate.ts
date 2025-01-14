import { Collection, Document, AggregationCursor } from 'mongodb';
import _ from 'underscore';
import config from './config';
import {
  prepareResponse,
  generateSort,
  generateCursorQuery,
  PaginationParams,
} from './utils/query';
import sanitizeParams, { SanitizeParams } from './utils/sanitizeParams';
import { PaginationResponse } from './utils/query';
interface AggregateParams extends PaginationParams {
  aggregation?: Document[];
  options?: Record<string, any>;
  before?: string;
  collation?: Record<string, any> | null;
}

/**
 * Performs an aggregate() query on a passed-in Mongo collection, using criteria you specify.
 * Unlike `find()`, this method requires fine tuning by the user, and must comply with the following
 * two criteria so that the pagination magic can work properly.
 *
 * 1. `aggregate()` will insert a `$sort` and `$limit` clauses in your aggregation pipeline immediately after
 * the first $match is found. Consider this while building your pipeline.
 *
 * 2. The documents resulting from the aggregation _must_ contain the paginated fields so that a
 * cursor can be built from the result set.
 *
 * Additionally, an additional query will be appended to the first `$match` found in order to apply the offset
 * required for the cursor.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    or the mongoist package's `db.collection(<collectionName>)` method.
 * @param {Object} params
 *    -aggregation {Object[]} The aggregation query.
 *    -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
 *    -paginatedField {String} The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Immutable. If the value changes between paged queries, it could appear twice.
 *        3. Accessible. The field must be present in the aggregation's end result so the
 *          aggregation steps added at the end of the pipeline to implement the paging can access it.
          4. Consistent. All values (except undefined and null values) must be of the same type.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 *    -sortAscending {boolean} Whether to sort in ascending order by the `paginatedField`.
 *    -sortCaseInsensitive {boolean} Whether to ignore case when sorting, in which case `paginatedField`
 *      must be a string property.
 *    -next {String} The value to start querying the page.
 *    -previous {String} The value to start querying previous page.
 *    -after {String} The _id to start querying the page.
 *    -before {String} The _id to start querying previous page.
 *    -options {Object} Aggregation options
 *    -collation {Object} An optional collation to provide to the mongo query. E.g. { locale: 'en', strength: 2 }. When null, disables the global collation.
 */
export default async function aggregate(
  collection: Collection<Document>,
  params: AggregateParams
): Promise<PaginationResponse<Document>> {
  // Sanitize and set defaults for parameters
  params = _.defaults(await sanitizeParams(collection, params as SanitizeParams), {
    aggregation: [],
  });

  const $match = generateCursorQuery(params);
  const $sort = generateSort(params);
  const $limit = (params.limit || 0) + 1;

  let aggregationPipeline: Document[];

  if (params.sortCaseInsensitive) {
    aggregationPipeline = params.aggregation.concat([
      { $addFields: { __lc: { $toLower: `$${params.paginatedField}` } } },
      { $match },
      { $sort },
      { $limit },
      { $project: { __lc: 0 } },
    ]);
  } else {
    aggregationPipeline = params.aggregation.concat([{ $match }, { $sort }, { $limit }]);
  }

  const options: Record<string, any> = { ...(params.options || {}) };

  // Handle collation
  const isCollationNull = params.collation === null;
  const collation = params.collation || config.COLLATION;
  if (collation && !isCollationNull) {
    options.collation = collation;
  }

  // Determine the aggregation method based on the library (native MongoDB or mongoist)
  const aggregateMethod = 'aggregateAsCursor' in collection ? 'aggregateAsCursor' : 'aggregate';

  const cursor: AggregationCursor<Document> = collection[aggregateMethod](
    aggregationPipeline,
    options
  );

  const results = await cursor.toArray();

  return prepareResponse(results, params);
}
