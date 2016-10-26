var _ = require('underscore');
var EJSON = require('mongodb-extended-json');
var base64url = require('base64-url');

/**
 * This method performs a range query on a passed-in Mongo collection, using criteria you specify.
 *
 * @param {MongoCollection} collection A collection object returned from the MongoDB library's
 *    `db.collection(<collectionName>)` method.
 * @param {Object} params
 *    -query {Object} The mongo query to pass to Mongo.
 *    -limit {Number} The page size. Must be between 1 and 100 (though can be overridden by
 *      setting MAX_LIMIT).
 *    -fields {Object} Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
 *      The default is to query all fields.
 *    -paginatedField {String} The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value.
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 *    -next {String} The value to start querying the page. Defaults to start at the beginning of
 *      the collection.
 *    -previous {String} The value to start querying previous page. Default is to not query backwards.
 * @param {Function} done Node errback style function.
 */
function find(collection, params, done) {
  if (_.isString(params.limit)) params.limit = parseInt(params.limit);
  if (params.previous) params.previous = urlSafeDecode(params.previous);
  if (params.next) params.next = urlSafeDecode(params.next);

  params = _.defaults(params, {
    query: {},
    limit: module.exports.MAX_LIMIT,
    paginatedField: '_id'
  });

  if (params.limit < 1) params.limit = 1;
  if (params.limit > module.exports.MAX_LIMIT) params.limit = module.exports.MAX_LIMIT;

  var fields;

  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {
    fields = _.extend({}, params.fields, {
      [params.paginatedField]: 1
    });
  }

  if (params.next) {
    params.query[params.paginatedField] = {
      $lt: params.next
    };
  } else if (params.previous) {
    params.query[params.paginatedField] = {
      $gt: params.previous
    };
  }

  collection
    .find(params.query, fields)
    .sort({
      [params.paginatedField]: params.previous ? 1 : -1
    })
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
        if (params.next) {
          response = {
            results: [],
            previous: params.next
          };
        } else if (params.previous) {
          response = {
            results: [],
            next: params.previous
          };
        } else {
          response = {
            results: []
          };
        }
      } else if (fullPageOfResults && !params.next && !params.previous) {
        response = {
          results,
          next: results[results.length - 1][params.paginatedField]
        };
      } else if (fullPageOfResults) {
        response = {
          results,
          previous: results[0][params.paginatedField],
          next: results[results.length - 1][params.paginatedField]
        };
      } else if (params.next) {
        response = {
          results,
          previous: results[results.length - 1][params.paginatedField]
        };
      } else if (params.previous) {
        response = {
          results,
          next: results[0][params.paginatedField]
        };
      } else {
        response = {
          results
        };
      }

      if (response.previous) response.previous = urlSafeEncode(response.previous);
      if (response.next) response.next = urlSafeEncode(response.next);

      // If the user didn't include the paginated field in their desired fields and we included
      // it for them, remove it.
      if (params.fields && !_.has(params.fields, params.paginatedField)) {
        response.results = _.map(response.results, result => _.omit(result, params.paginatedField));
      }

      done(null, response);
    });
}

function urlSafeEncode(obj) {
  return base64url.encode(EJSON.stringify(obj));
}

function urlSafeDecode(str) {
  return EJSON.parse(base64url.decode(str));
}

module.exports = {
  find,
  MAX_LIMIT: 100
};
