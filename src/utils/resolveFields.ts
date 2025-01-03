import { ProjectionFieldSet } from 'projection-utils';
import _ from 'underscore';

/**
 * Produce a ProjectionFieldSet from the given MongoDB projection, after validating it to ensure it
 * doesn't have exclusion rules.
 *
 * @param projection - The projected fields.
 * @param includeIdDefault - Whether to include _id by default (MongoDB's default behavior).
 * @returns The synthesized field set.
 */
function fieldsFromMongo(
  projection: Record<string, any> = {},
  includeIdDefault = false
): ProjectionFieldSet {
  const fields = _.reduce(
    projection,
    (memo: string[], value: any, key: string) => {
      if (key !== '_id' && value !== undefined && !value) {
        throw new TypeError('projection includes exclusion, but we do not support that');
      }
      if (value || (key === '_id' && value === undefined && includeIdDefault)) {
        memo.push(key);
      }

      return memo;
    },
    [] as string[]
  );

  return ProjectionFieldSet.fromDotted(fields);
}

/**
 * Resolve the fields object, given potentially untrusted fields the user has provided, permitted
 * fields defined by the application, and override fields that should always be provided.
 *
 * @param desiredFields - The fields in the request.
 * @param allowedFields - A shallow fields object defining the fields permitted in desiredFields.
 *                         If not provided, any field is allowed.
 * @param overrideFields - A shallow fields object defining fields that should always be included
 *                         or excluded as specified.
 * @returns The resolved fields declaration, or null if no fields are valid.
 */
function resolveFields(
  desiredFields?: string[] | null,
  allowedFields?: Record<string, any> | null,
  overrideFields?: Record<string, any> | null
): Record<string, any> | null {
  if (desiredFields != null && !Array.isArray(desiredFields)) {
    throw new TypeError('expected nullable array for desiredFields');
  }

  if (allowedFields != null && !_.isObject(allowedFields)) {
    throw new TypeError('expected nullable plain object for allowedFields');
  }

  if (overrideFields !== undefined && !_.isObject(overrideFields)) {
    throw new TypeError('expected optional plain object for overrideFields');
  }

  // If no desired fields are specified, treat it as wanting the default set of fields.
  const desiredFieldset = _.isEmpty(desiredFields)
    ? new ProjectionFieldSet([[]])
    : ProjectionFieldSet.fromDotted(desiredFields);

  // If allowedFields isn't provided, treat it as unrestricted. If it's an empty object, treat it
  // as no valid fields.
  const allowedFieldset = allowedFields
    ? fieldsFromMongo(allowedFields)
    : new ProjectionFieldSet([[]]);

  // Validate desired fields against allowed fields and include overrides.
  const fields = desiredFieldset
    .intersect(allowedFieldset)
    .union(fieldsFromMongo(overrideFields || {}));

  if (fields.isEmpty()) {
    // If no valid fields are available, return null to avoid querying with no fields.
    return null;
  }

  // Generate the MongoDB projection object.
  const projection = fields.toMongo();

  // Check if overrideFields explicitly removes _id.
  const disableIdOverride =
    overrideFields && overrideFields._id !== undefined && !overrideFields._id;

  // Exclude _id if not allowed or explicitly disabled in overrideFields.
  if (!fields.contains(['_id']) || disableIdOverride) {
    projection._id = 0;
  }

  return projection;
}

export default resolveFields;
