const { ProjectionFieldSet } = require('projection-utils');
const _ = require('underscore');

/**
 * Produce a ProjectionFieldSet from the given mongo projection, after validating it to ensure it
 * doesn't have exclusion rules.
 *
 * @param {Object<String, *>} projection The projected fields.
 * @param {Boolean=} includeIdDefault Whether to include _id by default (mongo's default behavior).
 * @returns {ProjectionFieldSet} The synthesized field set.
 */
function fieldsFromMongo(projection = {}, includeIdDefault = false) {
  const fields = _.reduce(
    projection,
    (memo, value, key) => {
      if (key !== '_id' && value !== undefined && !value) {
        throw new TypeError('projection includes exclusion, but we do not support that');
      }
      if (value || (key === '_id' && value === undefined && includeIdDefault)) {
        memo.push(key);
      }

      return memo;
    },
    []
  );

  return ProjectionFieldSet.fromDotted(fields);
}

/**
 * Resolve the fields object, given potentially untrusted fields the user has provided, permitted
 * fields defined by the application, and override fields that should always be provided.
 *
 * @param {String[]} desiredFields The fields in the request.
 * @param {?Object<String, *>=} allowedFields A shallow fields object defining the fields permitted
 *   in desiredFields. If not provided, we just allow any field.
 * @param {Object<String, *>=} overrideFields A shallow fields object defining fields that should
 *   always be configured as specified.
 * @returns {?Object<String, *>=} The resolved fields declaration.
 */
function resolveFields(desiredFields, allowedFields, overrideFields) {
  if (desiredFields != null && !Array.isArray(desiredFields)) {
    throw new TypeError('expected nullable array for desiredFields');
  }

  if (allowedFields != null && !_.isObject(allowedFields)) {
    throw new TypeError('expected nullable plain object for allowedFields');
  }

  if (overrideFields !== undefined && !_.isObject(overrideFields)) {
    throw new TypeError('expected optional plain object for overrideFields');
  }

  // If no desired fields are specified, we treat that as wanting the default set of fields.
  const desiredFieldset = _.isEmpty(desiredFields)
    ? new ProjectionFieldSet([[]])
    : ProjectionFieldSet.fromDotted(desiredFields);

  // If allowedFields isn't provided, we treat that as not having restrictions. However, if it's an
  // empty array, we treat that as have no valid fields.
  const allowedFieldset = allowedFields
    ? fieldsFromMongo(allowedFields)
    : new ProjectionFieldSet([[]]);

  // Don't trust fields passed in the querystring, so whitelist them against the
  // fields defined in parameters. Add override fields from parameters.
  const fields = desiredFieldset.intersect(allowedFieldset).union(fieldsFromMongo(overrideFields));

  if (fields.isEmpty()) {
    // This projection isn't representable as a mongo projection - nor should it be. We don't want
    // to query mongo for zero fields.
    return null;
  }

  // Generate the mongo projection.
  const projection = fields.toMongo();

  // Whether overrideFields explicitly removes _id.
  const disableIdOverride =
    overrideFields && overrideFields._id !== undefined && !overrideFields._id;

  // Explicitly exclude the _id field (which mongo includes by default) if we don't allow it, or
  // if we've disabled it in the override.
  if (!fields.contains(['_id']) || disableIdOverride) {
    // If the override excludes _id, then enforce that here. All other fields will be included by
    // default, so we don't need to specify them individually, as we only support whitelisting
    // fields, and do not support field blacklists.
    projection._id = 0;
  }
  return projection;
}

module.exports = resolveFields;
