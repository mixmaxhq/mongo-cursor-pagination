export type PaginationResponse = {
  results: any[];
  previous?: any;
  hasPrevious?: boolean;
  next?: any;
  hasNext?: boolean;
  totalCount?: number;
};
