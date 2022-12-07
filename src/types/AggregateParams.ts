import { AggregateOptions } from "mongodb"

export type AggregateParams = {
  aggregation?: object[],
  limit?: number,
  fields?: object,
  paginatedField?: string,
  sortAscending?: boolean,
  sortCaseInsensitive?: boolean,
  getTotal?: boolean,
  next?: string | any[],
  previous?: string | any[],
  after?: string,
  before?: string,
  hint?: string,
  options?: AggregateOptions,
  collation?: object
}