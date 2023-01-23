import { encode } from '../../src/utils/bsonUrlEncoding';
import { encodePaginationTokens } from '../../src/utils/query';

describe('encodePaginationTokens', () => {
  it('encodes the pagination tokens on the passed-in response object', () => {
    const params = {
      paginatedField: '_id',
    };
    const response = {
      next: { _id: '789' },
      previous: { _id: '456' },
    };

    encodePaginationTokens(params, response);

    expect(response.next).toEqual(encode('789'));
    expect(response.previous).toEqual(encode('456'));
  });

  it("constructs pagination tokens using both the _id and the paginatedField if the latter isn't the former", () => {
    const params = {
      paginatedField: 'name',
    };
    const response = {
      next: { _id: '789', name: 'Test 2' },
      previous: { _id: '456', name: 'Test' },
    };

    encodePaginationTokens(params, response);

    expect(response.next).toEqual(encode(['Test 2', '789']));
    expect(response.previous).toEqual(encode(['Test', '456']));
  });
});
