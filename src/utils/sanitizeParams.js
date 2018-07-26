const _ = require('underscore');
const bsonUrlEncoding = require('./bsonUrlEncoding');
const getPropertyViaDotNotation = require('./getPropertyViaDotNotation');
const config = require('../config');

module.exports = async function sanitizeParams(collection, params) {
  if (params.previous) params.previous = bsonUrlEncoding.decode(params.previous);
  if (params.next) params.next = bsonUrlEncoding.decode(params.next);

  params = _.defaults(params, {
    limit: config.DEFAULT_LIMIT,
    paginatedField: '_id'
  });

  if (params.limit < 1) params.limit = 1;
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

  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {
    params.fields = _.extend({
      _id: 0 // Mongo includes this field by default, so don't request it unless the user wants it.
    }, params.fields);

    if (!params.fields[params.paginatedField]) {
      params.fields[params.paginatedField] = 1;
    }
  }

  return params;
};