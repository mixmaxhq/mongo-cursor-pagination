var _ = require('underscore');
var objectPath = require('object-path');
var config = require('./config');
var bsonUrlEncoding = require('./utils/bsonUrlEncoding');

/**
 * Performs a find() query on a passed-in Mongo collection, using criteria you specify. The results
 * are ordered by the paginatedField.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    or the mongoist package's `db.collection(<collectionName>)` method.
 * @param {Object} params
 *    -query {Object} The find query.
 *    -limit {Number} The page size. Must be between 1 and `config.MAX_LIMIT`. Can be 0 if canUnlimit field is truthy.
 *    -canUnlimit {Boolean} Allows to disable the limit (limit can be set to 0).
 *    -fields {Object} Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
 *      The default is to query all fields.
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
 */

function getPropertyViaDotNotation(propertyName, object) {
  const parts = propertyName.split('.');

  let prop = object;
  for (let i=0; i < parts.length; i++) {
    prop = prop[parts[i]];
  }
  return prop;
}

module.exports = async function(collection, params) {
  if (params.previous) params.previous = bsonUrlEncoding.decode(params.previous);
  if (params.next) params.next = bsonUrlEncoding.decode(params.next);

  params = _.defaults(params, {
    query: {},
    limit: config.DEFAULT_LIMIT,
    canUnlimit: false,
    paginatedField: '_id'
  });

  var queries = [params.query];

  if (params.limit < 1) {
    if (!params.canUnlimit || params.limit !== 0) {
      params.limit = 1;
    }
  }
  if (params.limit > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  // If the paginated field is not _id, then it might have duplicate values in it. This is bad
  // because then we can't exclusively use it for our range queries (that use $lt and $gt). So
  // to fix this, we secondarily sort on _id, which is always unique.
  var shouldSecondarySortOnId = params.paginatedField !== '_id';

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
        { [params.paginatedField]: true, _id: false },
      );
      if (doc) {
        // Handle usage of dot notation in paginatedField
        const prop = getPropertyViaDotNotation(params.paginatedField, doc);
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
        { [params.paginatedField]: true, _id: false },
      );
      if (doc) {
        // Handle usage of dot notation in paginatedField
        const prop = getPropertyViaDotNotation(params.paginatedField, doc);
        params.previous = [prop, params.before];
      }
    } else {
      params.previous = params.before;
    }
  }

  var fields;
  var removePaginatedFieldInResponse = false;

  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {
    fields = _.extend({
      _id: 0 // Mongo includes this field by default, so don't request it unless the user wants it.
    }, params.fields);

    if (!fields[params.paginatedField]) {
      fields[params.paginatedField] = 1;
      removePaginatedFieldInResponse = true;
    }
  }

  var sortAsc = (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);
  var comparisonOp = sortAsc ? '$gt' : '$lt';

  if (params.next) {
    if (shouldSecondarySortOnId) {
      queries.push({
        $or: [{
          [params.paginatedField]: {
            [comparisonOp]: params.next[0]
          }
        }, {
          [params.paginatedField]: {
            $eq: params.next[0]
          },
          _id: {
            [comparisonOp]: params.next[1]
          }
        }]
      });
    } else {
      queries.push({
        [params.paginatedField]: {
          [comparisonOp]: params.next
        }
      });
    }
  } else if (params.previous) {
    if (shouldSecondarySortOnId) {
      queries.push({
        $or: [{
          [params.paginatedField]: {
            [comparisonOp]: params.previous[0]
          }
        }, {
          [params.paginatedField]: {
            $eq: params.previous[0]
          },
          _id: {
            [comparisonOp]: params.previous[1]
          }
        }]
      });
    } else {
      queries.push({
        [params.paginatedField]: {
          [comparisonOp]: params.previous
        }
      });
    }
  }

  var sortDir = sortAsc ? 1 : -1;
  var sort;
  if (shouldSecondarySortOnId) {
    sort = {
      [params.paginatedField]: sortDir,
      _id: sortDir
    };
  } else {
    sort = {
      [params.paginatedField]: sortDir
    };
  }

  // Support both the native 'mongodb' driver and 'mongoist'. See:
  // https://www.npmjs.com/package/mongoist#cursor-operations
  var findMethod = collection.findAsCursor ? 'findAsCursor': 'find';

  var response;
  if (params.limit === 0) {
    var results = await collection[findMethod]({ $and: queries }, fields)
      .sort(sort)
      .toArray();

    response = {
      results,
      previous: results[0],
      hasPrevious: false,
      next: results[results.length - 1],
      hasNext: false
    };
  } else {
    var results = await collection[findMethod]({ $and: queries }, fields)
      .sort(sort)
      .limit(params.limit + 1) // Query one more element to see if there's another page.
      .toArray();

    var hasMore = results.length > params.limit;
    // Remove the extra element that we added to 'peek' to see if there were more entries.
    if (hasMore) results.pop();

    var hasPrevious = !!params.next || !!(params.previous && hasMore);
    var hasNext = !!params.previous || hasMore;

    // If we sorted reverse to get the previous page, correct the sort order.
    if (params.previous) results = results.reverse();

    response = {
      results,
      previous: results[0],
      hasPrevious,
      next: results[results.length - 1],
      hasNext
    };
  }

  if (response.previous) {
    var previousPaginatedField = objectPath.get(response.previous, params.paginatedField);
    if (shouldSecondarySortOnId) {
      response.previous = bsonUrlEncoding.encode([previousPaginatedField, response.previous._id]);
    } else {
      response.previous = bsonUrlEncoding.encode(previousPaginatedField);
    }
  }
  if (response.next) {
    var nextPaginatedField = objectPath.get(response.next, params.paginatedField);
    if (shouldSecondarySortOnId) {
      response.next = bsonUrlEncoding.encode([nextPaginatedField, response.next._id]);
    } else {
      response.next = bsonUrlEncoding.encode(nextPaginatedField);
    }
  }

  // Remove fields that we added to the query (such as paginatedField and _id) that the user didn't ask for.
  if (removePaginatedFieldInResponse) {
    response.results = _.map(response.results, (result) => _.omit(result, params.paginatedField));
  }

  return response;
};
