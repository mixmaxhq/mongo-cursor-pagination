import { Collection, ObjectId } from 'mongodb';
import { AggregateInputParams, AggregateParams, QueryInputParams, QueryParams } from '../types';
import config from '../config';
import { decode } from './bsonUrlEncoding';
import getPropertyViaDotNotation from './getPropertyViaDotNotation';

export default async (
  collection: Collection | any,
  params: QueryInputParams | AggregateInputParams
): Promise<QueryParams | AggregateParams> => {
  //
  // set the params.paginatedField
  params.paginatedField ??= '_id';

  // set the params.limit
  params.limit = (() => {
    const requestedLimit = params.limit;
    if (requestedLimit < 1) return 1;
    if (requestedLimit > config.MAX_LIMIT) return config.MAX_LIMIT;
    return requestedLimit || config.DEFAULT_LIMIT;
  })();

  // set params.previous || params.next
  if (params.previous) params.previous = decode(params.previous as string);
  if (params.next) params.next = decode(params.next as string);
  // if after || before in params, overwrite an existing previous || next value
  if (params.after || params.before) await applyAfterOrBeforeToParams({ collection, params });

  // set the params.fields, which are the requested projected fields PLUS the paginated field
  // (the latter required for sorting and constucting the cursor)
  if (params.fields) {
    const { fields: requestedFields, paginatedField } = params;
    params.fields = {
      _id: 0, // mongo projects _id by default, so ensure only projecting if user requests
      ...requestedFields,
      [paginatedField]: 1,
    };
  }

  return params;
};

/**
 * @description
 * The 'after' param sets the start position for the next page. This is similar to the
 * 'next' param, with the difference that 'after' takes a plain _id instead of an encoded
 * string of both _id and paginatedField values.
 * > a valid params.after will override params.next value
 *
 * The 'before' param sets the start position for the previous page. This is similar to the
 * 'previous' param, with the difference that 'before' takes a plain _id instead of an encoded
 * string of both _id and paginatedField values.
 * > a valid params.before will override params.previous value
 *
 * @returns undefined (but may update the given params.next || params.previous with a decoded cursor)
 */
async function applyAfterOrBeforeToParams({
  collection,
  params,
}: {
  collection: any;
  params: QueryInputParams;
}) {
  const { after, before, sortCaseInsensitive, paginatedField } = params;
  if ((after && before) || (!after && !before)) return;

  // if the primary sort field is the _id, then the results are assured to have a unique
  // value, and after || before can immediately overwrite the next || previous param
  if (paginatedField === '_id') {
    after ? (params.next = after) : (params.previous = before);
    return;
  }

  // otherwise an alternative primary field may have duplicates affecting $gt | $lt sorts, so
  // will need to be secondarily sorted by _id. As 'after' && 'before' cursors ONLY hold an _id
  // value, the primary sort value needs to be established to create a valid next | previous cursor
  const document = await collection.findOne(
    { _id: new ObjectId(after || before) },
    { [paginatedField]: true, _id: false }
  );
  if (!document) return;

  // retrieve paginated field value (field can be single or dot-notation; such as "user.first_name")
  const paginatedFieldValue = getPropertyViaDotNotation({
    propertyName: paginatedField,
    object: document,
    sortCaseInsensitive,
  });

  // decoded next | previous cursor expection is [ <value of paginated field in document >, < _id of document >]
  if (after) params.next = [paginatedFieldValue, after];
  if (before) params.previous = [paginatedFieldValue, before];
}
