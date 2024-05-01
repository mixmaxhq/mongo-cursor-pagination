import { Collection } from "mongodb";
import _ from "underscore";

import config from "./config";
import { AggregateParamsMulti, PaginationResponse } from "./types";
import {
  filterProjectedFields,
  generateCursorQueryMulti,
  generateSorts,
  prepareResponse,
} from "./utils/query";
import { sanitizeMultiParamsMutate } from "./utils/sanitizeParams";

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
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's.
 * @param {AggregateParamsMulti} params
 * @param {object[]} params.aggregation  The aggregation query.
 * @param {Number} params.limit The page size. Must be between 1 and `config.MAX_LIMIT`.
 * @param {String} params.paginatedField The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Immutable. If the value changes between paged queries, it could appear twice.
 *        3. Accessible. The field must be present in the aggregation's end result so the
 *          aggregation steps added at the end of the pipeline to implement the paging can access it.
          4. Consistent. All values (except undefined and null values) must be of the same type.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 * @param {boolean} params.sortAscending Whether to sort in ascending order by the `paginatedField`.
 * @param {boolean} params.sortCaseInsensitive Whether to ignore case when sorting, in which case `paginatedField`
 *      must be a string property.
 * @param {String} params.next The value to start querying the page.value to start querying previous page.
 * @param {String} params.after The _id to start querying the page.
 * @param {String} params.previous The _id to start querying previous page.
 * @param {object} params.options Aggregation options
 * @param {object} params.collation An optional collation to provide to the mongo query. E.g. { locale: 'en', strength: 2 }. When null, disables the global collation.
 */
export default async (
  collection: Collection | any,
  params: AggregateParamsMulti
): Promise<PaginationResponse> => {
  const projectedFields = params.fields;
  params = _.defaults(await sanitizeMultiParamsMutate(collection, params), {
    aggregation: [],
  });
  const $match = generateCursorQueryMulti(params);
  const $sort = generateSorts(params);
  const $limit = params.limit + 1;
  const isCaseInsensitive = params.paginatedFields.some(
    pf => pf.sortCaseInsensitive
  );

  const aggregationQuery = (() => {
    const { aggregation } = params;

    if (!isCaseInsensitive)
      return [...aggregation, { $match }, { $sort }, { $limit }];

    // else if required to be sorted by lower case, then add a field via the aggregation
    // pipeline that stores the lowercase value of the paginated field. Use this to sort
    // and add to cursors, but return the original paginated field value to client.
    const addLowerCaseFieldSearch = {
      $addFields: Object.assign(
        {},
        ...params.paginatedFields.map(pf => ({
          [`__lower_case_value_${pf.paginatedField}`]: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: `$${pf.paginatedField}` }, "null"] },
                  then: null,
                },
                {
                  case: {
                    $eq: [{ $type: `$${pf.paginatedField}` }, "missing"],
                  },
                  then: null,
                },
                {
                  case: { $eq: [{ $type: `$${pf.paginatedField}` }, "string"] },
                  then: { $toLower: `$${pf.paginatedField}` },
                },
              ],
              default: `$${pf.paginatedField}`,
            },
          },
        }))
      ),
    };

    return [
      ...aggregation,
      addLowerCaseFieldSearch,
      { $match },
      { $sort },
      { $limit },
    ];
  })();

  // Aggregation options:
  // https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#aggregate
  // https://mongodb.github.io/node-mongodb-native/4.0/interfaces/aggregateoptions.html
  const options = Object.assign({}, params.options);

  /**
   * IMPORTANT
   *
   * If using collation, check the README:
   * https://github.com/mixmaxhq/mongo-cursor-pagination#important-note-regarding-collation
   */
  const isCollationNull = params.collation === null;
  const collation = params.collation || config.COLLATION;
  if (collation && !isCollationNull) options.collation = collation;

  if (params.hint) options.hint = params.hint;

  // Support both the native 'mongodb' driver and 'mongoist'. See:
  // https://www.npmjs.com/package/mongoist#cursor-operations
  const aggregateMethod = collection.aggregateAsCursor
    ? "aggregateAsCursor"
    : "aggregate";

  const results = await collection[aggregateMethod](
    aggregationQuery,
    options
  ).toArray();

  const response = prepareResponse(results, params, true);

  const projectedResults = filterProjectedFields({
    projectedFields,
    results: response.results,
    sortCaseInsensitive: isCaseInsensitive,
  });

  return { ...response, results: projectedResults };
};
