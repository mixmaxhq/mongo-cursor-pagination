var _ = require('underscore');
var config = require('./config');
var bsonUrlEncoding = require('./utils/bsonUrlEncoding');

/**
 * Performs a find() query on a passed-in Mongo collection, using criteria you specify. The results
 * are ordered by the paginatedField.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    `db.collection(<collectionName>)` method.
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
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 *    -next {String} The value to start querying the page.
 *    -previous {String} The value to start querying previous page.
 * @param {Function} done Node errback style function.
 */
module.exports = function(collection, params, done) {
  if (_.isString(params.limit)) params.limit = parseInt(params.limit);
  if (params.previous) params.previous = bsonUrlEncoding.decode(params.previous);
  if (params.next) params.next = bsonUrlEncoding.decode(params.next);

  params = _.defaults(params, {
    query: {},
    limit: config.MAX_LIMIT,
    paginatedField: '_id'
  });

  if (params.limit < 1) params.limit = 1;
  if (params.limit > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  // If the paginated field is not _id, then it might have duplicate values in it. This is bad
  // because then we can't exclusively use it for our range queries (that use $lt and $gt). So
  // to fix this, we secondarily sort on _id, which is always unique.
  var shouldSecondarySortOnId = params.paginatedField !== '_id';

  var fields;

  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {
    fields = _.extend({}, params.fields, {
      [params.paginatedField]: 1
    });
  }

  if (params.next) {
    if (shouldSecondarySortOnId) {
      params.query.$or = [{
        [params.paginatedField]: {
          $lt: params.next[0]
        }
      }, {
        [params.paginatedField]: {
          $eq: params.next[0]
        },
        _id: {
          $lt: params.next[1]
        }
      }];
    } else {
      params.query[params.paginatedField] = {
        $lt: params.next
      };
    }
  } else if (params.previous) {
    if (shouldSecondarySortOnId) {
      params.query.$or = [{
        [params.paginatedField]: {
          $gt: params.previous[0]
        }
      }, {
        [params.paginatedField]: {
          $eq: params.previous[0]
        },
        _id: {
          $gt: params.previous[1]
        }
      }];
    } else {
      params.query[params.paginatedField] = {
        $gt: params.previous
      };
    }
  }

  var sort;
  if (shouldSecondarySortOnId) {
    sort = {
      [params.paginatedField]: params.previous ? 1 : -1,
      _id: params.previous ? 1 : -1
    };
  } else {
    sort = {
      [params.paginatedField]: params.previous ? 1 : -1
    };
  }

  collection
    .find(params.query, fields)
    .sort(sort)
    .limit(params.limit)
    .toArray((err, results) => {
      if (err) {
        done(err);
        return;
      }

      // If we sorted reverse to get the previous page, correct the sort order.
      if (params.previous) results = results.reverse();

      // Return 'previous' and 'next' cursors, based on what we know about the results.
      // This logic is imperfect because it might return 'next' if there are no more results.
      // This is probably fine since it just means they'll get back an empty query.

      var fullPageOfResults = (results.length === params.limit);

      var response;
      if (results.length === 0) {
        response = {
          results: []
        };
      } else if (fullPageOfResults && !params.next && !params.previous) {
        response = {
          results,
          next: results[results.length - 1]
        };
      } else if (fullPageOfResults) {
        response = {
          results,
          previous: results[0],
          next: results[results.length - 1]
        };
      } else if (params.next) {
        response = {
          results,
          previous: results[results.length - 1]
        };
      } else if (params.previous) {
        response = {
          results,
          next: results[0]
        };
      } else {
        response = {
          results
        };
      }

      if (response.previous) {
        if (shouldSecondarySortOnId) {
          response.previous = bsonUrlEncoding.encode([response.previous[params.paginatedField], response.previous._id]);
        } else {
          response.previous = bsonUrlEncoding.encode(response.previous[params.paginatedField]);
        }
      }
      if (response.next) {
        if (shouldSecondarySortOnId) {
          response.next = bsonUrlEncoding.encode([response.next[params.paginatedField], response.next._id]);
        } else {
          response.next = bsonUrlEncoding.encode(response.next[params.paginatedField]);
        }
      }

      // If the user didn't include the paginated field in their desired fields and we included
      // it for them, remove it.
      if (params.fields && !_.has(params.fields, params.paginatedField)) {
        response.results = _.map(response.results, result => _.omit(result, params.paginatedField));
      }

      done(null, response);
    });
};
