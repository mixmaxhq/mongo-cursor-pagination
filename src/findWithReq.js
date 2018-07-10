var find = require('./find');
var resolveFields = require('./utils/resolveFields');
var _ = require('underscore');

/**
 * Normalize the given query parameter to an array, so we support both param=a,b and
 * param[]=a&param[]=b.
 *
 * @param {Object} query The parsed query object containing the given parameter.
 * @param {String} param The parameter to normalize.
 * @returns {String[]} The normalized array from the given query parameter.
 * @throws {TypeError} When the query parameter isn't a string, an empty value, or an array of
 *   strings.
 */
function normalizeQueryArray(query, param) {
  const value = query[param];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; ++i) {
      if (!_.isString(value[i])) {
        throw new TypeError('expected string array or comma-separated string for ' + param);
      }
    }
    return value;
  }
  // This goes before _.isString so we don't split an empty string into ['']. The array option just
  // uses whatever the user provides.
  if (_.isEmpty(value)) {
    return [];
  }
  if (_.isString(value)) {
    return value.split(',');
  }
  throw new TypeError('expected string array or comma-separated string for ' + param);
}

/**
 * A wrapper around `find()` that make it easy to implement a basic HTTP API using Express. So your
 * user can call "/list?limit=1&fields=_id,name" and the querystring parameters will be passed
 * to this method on the Express request object.
 *
 * @params {ExpressRequest} req An express request object with the following on the querystring:
 *    -limit: If a numeric string, passed to `find()` as the limit. If limit also passed in params
 *      then this value cannot exceed it.
 *    -next: If a non-empty string, passed to `find()` as the next cursor.
 *    -previous: If a non-empty string, passed to `find()` as the previous cursor.
 *    -fields: If a non-empty string, used to limit fields that are returned. Multiple fields
 *      can be specified as a comma-delimited list. If field name used is not in params.fields,
 *      it will be ignored.
 * @params {MongoCollection} collection A collection object returned from the MongoDB library's
 *    or the mongoist package's `db.collection(<collectionName>)` method.
 * @param {Object} params See documentation for `find()`, plus these options:
 *    -overrideFields: an object containing fields that should override fields from the querystring, e.g.
 *      {_id: 0} or {internalField: 1}. We only support field exclusion for _id, as we expect whitelists
 *      for fields from both params.fields and params.overrideFields.
 */
module.exports = async function(req, collection, params) {
  params = params || {};

  if (!_.isEmpty(req.query.limit)) {
    var limit = parseInt(req.query.limit);
    // Don't let the user specify a higher limit than params.limit, if defined.
    if (!isNaN(limit) && (!params.limit || params.limit > limit)) {
      params.limit = limit;
    }
  }

  if (!_.isEmpty(req.query.next)) {
    params.next = req.query.next;
  }

  if (!_.isEmpty(req.query.previous)) {
    params.previous = req.query.previous;
  }

  // Don't trust fields passed in the querystring, so whitelist them against the fields defined in
  // parameters.
  const fields = resolveFields(normalizeQueryArray(req.query, 'fields'), params.fields, params.overrideFields);
  if (fields === null) {
    throw new TypeError('no valid fields provided');
  }

  // Set fields to undefined if it's empty to avoid adding _id: 0 in find.
  params.fields = _.isEmpty(fields) ? undefined : fields;

  return find(collection, params);
};
