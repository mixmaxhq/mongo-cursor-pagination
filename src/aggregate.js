const _ = require('underscore');

const config = require('./config');
const { prepareResponse, generateSort, generateCursorQuery } = require('./utils/query');
const sanitizeParams = require('./utils/sanitizeParams');

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
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 *    -next {String} The value to start querying the page.
 *    -previous {String} The value to start querying previous page.
 *    -after {String} The _id to start querying the page.
 *    -before {String} The _id to start querying previous page.
 *    -options {Object} Aggregation options
 * @param {(() => number) | undefined | null} getPipelineIndexFn Functor that determines where to insert the pagination-specific operations in the pipeline
 *    This parameter controls the placement of the pagination-specific operations in the pipeline to allow more advanced use cases
 *    - undefined => preserves legacy behavior (backwards-compatible)
 *    - null => allows a more "common" behavior that allows data transformation prior to pagination (eg. includes reshaping _id value to be used in default pagination)
 *    - custom function => allows for a user-defined impl (special/advanced cases such as post-processing of results server-side)
 */
module.exports = async function aggregate(collection, params, getPipelineIndexFn) {
  params = _.defaults(await sanitizeParams(collection, params), { aggregation: [] });
  const cursorQuery = generateCursorQuery(params);
  const $sort = generateSort(params);

  if (getPipelineIndexFn === undefined) {
    getPipelineIndexFn = () => _.findIndex(params.aggregation, (step) => !_.isEmpty(step.$match));
  } else if (getPipelineIndexFn === null) {
    getPipelineIndexFn = () => params.aggregation.length - 1;
  }
  const index = getPipelineIndexFn();

  // assumes consecutive matches can/should be optimized by the server engine rather than client side
  params.aggregation.splice(index + 1, 0, { $match: cursorQuery });
  params.aggregation.splice(index + 2, 0, { $sort });
  params.aggregation.splice(index + 3, 0, { $limit: params.limit + 1 });

  // Aggregation options:
  // https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#aggregate
  // https://mongodb.github.io/node-mongodb-native/4.0/interfaces/aggregateoptions.html
  const options = params.options || {};
  /**
   * IMPORTANT
   *
   * If using a global collation setting, ensure that your collections' indexes (that index upon string fields)
   * have been created with the same collation option; if this isn't the case, your queries will be unable to
   * take advantage of any indexes.
   *
   * See mongo documentation: https://docs.mongodb.com/manual/reference/collation/#collation-and-index-use
   */
  if (config.COLLATION) options.collation = config.COLLATION;

  // Support both the native 'mongodb' driver and 'mongoist'. See:
  // https://www.npmjs.com/package/mongoist#cursor-operations
  const aggregateMethod = collection.aggregateAsCursor ? 'aggregateAsCursor' : 'aggregate';
  const results = await collection[aggregateMethod](params.aggregation, options).toArray();

  return prepareResponse(results, params);
};
