import bsonUrlEncoding from '../../src/utils/bsonUrlEncoding';
import { encodePaginationTokens, generateCursorQuery } from '../../src/utils/query';

describe('encodePaginationTokens', () => {
  it('encodes the pagination tokens on the passed-in response object', () => {
    const params = {
      paginatedField: '_id',
    };
    const response = {
      results: [],
      previous: { _id: '456' },
      hasPrevious: false,
      next: { _id: '789' },
      hasNext: false,
    };

    encodePaginationTokens(params, response);

    expect(response.next).toEqual(bsonUrlEncoding.encode('789'));
    expect(response.previous).toEqual(bsonUrlEncoding.encode('456'));
  });

  it("constructs pagination tokens using both the _id and the paginatedField if the latter isn't the former", () => {
    const params = {
      paginatedField: 'name',
    };
    const response = {
      results: [],
      previous: { _id: '456', name: 'Test' },
      hasPrevious: false,
      next: { _id: '789', name: 'Test 2' },
      hasNext: false,
    };

    encodePaginationTokens(params, response);

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
