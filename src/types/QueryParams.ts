type QueryParams = {
  query?: object,
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
  collation?: object,
  overrideFields?: any
}