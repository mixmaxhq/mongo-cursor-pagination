type PaginationParams = {
  query: object,
  limit: number,
  fields: object,
  paginatedField: string,
  sortAscending: boolean,
  sortCaseInsensitive: boolean,
  getTotal: boolean,
  next: string,
  previous: string,
  after: string,
  before: string,
  hint: string,
  collation: object
}