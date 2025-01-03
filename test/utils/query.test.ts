import bsonUrlEncoding from '../../src/utils/bsonUrlEncoding';
import {
  encodePaginationTokens,
  PaginationResponse,
  generateCursorQuery,
} from '../../src/utils/query';

describe('encodePaginationTokens', () => {
  it('encodes the pagination tokens on the passed-in response object', () => {
    type PaginatedType = { _id: string };
    const params = {
      paginatedField: '_id',
    };
    const response: PaginationResponse<PaginatedType> = {
      results: [],
      previous: null,
      hasPrevious: false,
      next: null,
      hasNext: false,
    };
    const previous: PaginatedType = { _id: '456' };
    const next: PaginatedType = { _id: '789' };

    encodePaginationTokens<PaginatedType>(params, response, previous, next);

    expect(response.next).toEqual(bsonUrlEncoding.encode('789'));
    expect(response.previous).toEqual(bsonUrlEncoding.encode('456'));
  });

  it("constructs pagination tokens using both the _id and the paginatedField if the latter isn't the former", () => {
    type PaginatedType = { _id: string; name: string };
    const params = {
      paginatedField: 'name',
    };
    const response: PaginationResponse<PaginatedType> = {
      results: [],
      previous: null,
      hasPrevious: false,
      next: null,
      hasNext: false,
    };
    const previous: PaginatedType = { _id: '456', name: 'Test' };
    const next: PaginatedType = { _id: '789', name: 'Test 2' };

    encodePaginationTokens<PaginatedType>(params, response, previous, next);

    expect(response.next).toEqual(bsonUrlEncoding.encode(['Test 2', '789']));
    expect(response.previous).toEqual(bsonUrlEncoding.encode(['Test', '456']));
  });

  describe('generateCursorQuery', () => {
    it('generates an empty cursor query when no next or previous cursor is provided', () => {
      const params = {
        paginatedField: 'name',
      };
      const query = generateCursorQuery(params);
      expect(query).toEqual({});
    });

    it('generates a cursor query for a paginated field that is not _id', () => {
      const params = {
        paginatedField: 'name',
        next: '123',
      };
      const query = generateCursorQuery(params);
      expect(query).toEqual({
        $or: [{ name: { $lt: '1' } }, { name: null }, { _id: { $lt: '2' }, name: { $eq: '1' } }],
      });
    });
  });
});
