const _ = require('underscore');
const sanitizeParams = require('./utils/sanitizeParams');
const { prepareResponse, generateSort, generateCursorQuery } = require('./utils/query');
const aggregate = require('./aggregate');
const config = require('./config');

/**
 * Performs a find() query on a passed-in Mongo collection, using criteria you specify. The results
 * are ordered by the paginatedField.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    or the mongoist package's `db.collection(<collectionName>)` method.
 * @param {Object} params
 *    -query {Object} The find query.
 *    -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`.
 *    -fields {Object} Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
 *      The default is to query all fields.
 *    -paginatedField {String} The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
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
 *    -hint {String} An optional index hint to provide to the mongo query
 *    -collation {Object} An optional collation to provide to the mongo query. E.g. { locale: 'en', strength: 2 }. When null, disables the global collation.
 */
module.exports = async function(collection, params) {
  const removePaginatedFieldInResponse =
    params.fields && !params.fields[params.paginatedField || '_id'];

  let response;
  if (params.sortCaseInsensitive) {
    // For case-insensitive sorting, we need to work with an aggregation:
    response = aggregate(
      collection,
      Object.assign({}, params, {
        aggregation: params.query ? [{ $match: params.query }] : [],
      })
    );
  } else {
    // Need to repeat `params.paginatedField` default value ('_id') since it's set in 'sanitizeParams()'
    params = _.defaults(await sanitizeParams(collection, params), { query: {} });

    const cursorQuery = generateCursorQuery(params);
    const $sort = generateSort(params);

    // Support both the native 'mongodb' driver and 'mongoist'. See:
    // https://www.npmjs.com/package/mongoist#cursor-operations
    const findMethod = collection.findAsCursor ? 'findAsCursor' : 'find';

    const query = collection[findMethod]({ $and: [cursorQuery, params.query] }, params.fields);

    /**
     * IMPORTANT
     *
     * If using collation, check the README:
     * https://github.com/mixmaxhq/mongo-cursor-pagination#important-note-regarding-collation
     */
    const isCollationNull = params.collation === null;
    const collation = params.collation || config.COLLATION;
    const collatedQuery = collation && !isCollationNull ? query.collation(collation) : query;
    // Query one more element to see if there's another page.
    const cursor = collatedQuery.sort($sort).limit(params.limit + 1);
    if (params.hint) cursor.hint(params.hint);
    const results = await cursor.toArray();

    response = prepareResponse(results, params);
  }

  // Remove fields that we added to the query (such as paginatedField and _id) that the user didn't ask for.
  if (removePaginatedFieldInResponse) {
    response.results = _.map(response.results, (result) => _.omit(result, params.paginatedField));
  }

  return response;
};
