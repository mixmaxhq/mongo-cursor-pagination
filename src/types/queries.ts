import { AggregateOptions, CollationOptions } from "mongodb";
import { Document } from "mongodb";

interface BaseParams {
  limit?: number;
  fields?: object;
  /**
   * The field name to query the range for. The field must be:
   *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
   *          exist, the results will be secondarily ordered by the _id.
   *        2. Indexed. For large collections, this should be indexed for query performance.
   *        3. Immutable. If the value changes between paged queries, it could appear twice.
             4. Consistent. All values (except undefined and null values) must be of the same type.
   *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
   *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
   */
  paginatedField?: string;
  /**
   *  Whether to sort in ascending order by the `paginatedField`.
   */
  sortAscending?: boolean;
  /**
   * Whether to ignore case when sorting, in which case `paginatedField`
   */
  sortCaseInsensitive?: boolean;
  collation?: CollationOptions | null;
  getTotal?: boolean;
  /**
   *  The _id to start querying the page.
   */
  after?: string;
  /**
   *  The _id to start querying previous page.
   */
  before?: string;
  hint?: string;
}

type BaseParamsMulti = Omit<
  BaseParams,
  "paginatedField" | "sortAscending" | "sortCaseInsensitive"
> & { paginatedFields?: PaginatedField[]; aggregationSearch?: boolean };

export interface PaginatedField {
  /**
   * The field name to query the range for. The field must be:
   *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
   *          exist, the results will be secondarily ordered by the _id.
   *        2. Indexed. For large collections, this should be indexed for query performance.
   *        3. Immutable. If the value changes between paged queries, it could appear twice.
             4. Consistent. All values (except undefined and null values) must be of the same type.
   *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
   *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
   */
  paginatedField?: string;
  /**
   *  Whether to sort in ascending order by the `paginatedField`.
   */
  sortAscending?: boolean;
  /**
   * Whether to ignore case when sorting, in which case `paginatedField`
   */
  sortCaseInsensitive?: boolean;
}

interface Query {
  /**
   *  The find query.
   */
  query?: object | object[];
  /**
   *   The value to start querying the page.
   */
  next?: string | Document;
  /**
   *    The value to start querying previous page.
   */
  previous?: string | Document;
  overrideFields?: any;
}

interface QueryInput {
  /**
   *  The find query.
   */
  query?: object;
  /**
   *   The value to start querying the page.
   */
  next?: string | Document;
  /**
   *    The value to start querying previous page.
   */
  previous?: string | Document;
  overrideFields?: any;
}

interface Aggregate {
  /**
   *  The aggregation query.
   */
  aggregation?: object[];
  /**
   *   The value to start querying the page.
   */
  next?: string | Document;
  /**
   *    The value to start querying previous page.
   */
  previous?: string | Document;
  options?: AggregateOptions;
}

interface AggregateInput {
  /**
   *  The aggregation query.
   */
  aggregation?: object[];
  /**
   *   The value to start querying the page.
   */
  next?: string | Document;
  /**
   *    The value to start querying previous page.
   */
  previous?: string | Document;
  options?: AggregateOptions;
}

export type QueryInputParams = BaseParams & QueryInput;
export type QueryParams = BaseParams & Query;
export type QueryParamsMulti = BaseParamsMulti & Query;
export type QueryInputParamsMulti = BaseParamsMulti & QueryInput;

export type AggregateInputParams = BaseParams & AggregateInput & Query;
export type AggregateParams = BaseParams & Aggregate;

export type AggregateInputParamsMulti = BaseParamsMulti & AggregateInput;
export type AggregateParamsMulti = BaseParamsMulti & Aggregate;

export type SearchParams = {
  /**
   *  The find query.
   */
  query?: object;
  /**
   *  The page size. Must be between 1 and `config.MAX_LIMIT`.
   */
  limit?: number;
  fields?: object;
  /**
   *   The value to start querying the page.
   */
  next?: string | Document;
};
