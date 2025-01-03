import { Collection, Document, AggregationCursor } from 'mongodb';
import _ from 'underscore';
import config from './config';
import {
  prepareResponse,
  generateSort,
  generateCursorQuery,
  PaginationParams,
} from './utils/query';
import sanitizeParams, { SanitizeParams } from './utils/sanitizeParams';
import { PaginationResponse } from './utils/query';
interface AggregateParams extends PaginationParams {
  aggregation?: Document[];
  options?: Record<string, any>;
  before?: string;
  collation?: Record<string, any> | null;
}

export default async function aggregate(
  collection: Collection<Document>,
  params: AggregateParams
): Promise<PaginationResponse<Document>> {
  // Sanitize and set defaults for parameters
  params = _.defaults(await sanitizeParams(collection, params as SanitizeParams), {
    aggregation: [],
  });

  const $match = generateCursorQuery(params);
  const $sort = generateSort(params);
  const $limit = (params.limit || 0) + 1;

  let aggregationPipeline: Document[];

  if (params.sortCaseInsensitive) {
    aggregationPipeline = params.aggregation.concat([
      { $addFields: { __lc: { $toLower: `$${params.paginatedField}` } } },
      { $match },
      { $sort },
      { $limit },
      { $project: { __lc: 0 } },
    ]);
  } else {
    aggregationPipeline = params.aggregation.concat([{ $match }, { $sort }, { $limit }]);
  }

  const options: Record<string, any> = { ...params.options };

  // Handle collation
  const isCollationNull = params.collation === null;
  const collation = params.collation || config.COLLATION;
  if (collation && !isCollationNull) {
    options.collation = collation;
  }

  // Determine the aggregation method based on the library (native MongoDB or mongoist)
  const aggregateMethod = 'aggregateAsCursor' in collection ? 'aggregateAsCursor' : 'aggregate';

  const cursor: AggregationCursor<Document> = collection[aggregateMethod](
    aggregationPipeline,
    options
  );

  const results = await cursor.toArray();

  return prepareResponse(results, params);
}
