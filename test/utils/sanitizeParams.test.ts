import { Collection } from 'mongodb';
import sanitizeParams from '../../src/utils/sanitizeParams';
import bsonUrlEncoding from '../../src/utils/bsonUrlEncoding';
import config from '../../src/config';

describe('sanitizeParams', () => {
  let collection: Collection;

  beforeEach(() => {
    collection = ({
      findOne: jest.fn(),
    } as unknown) as Collection;
  });

  it('should decode previous and next params', async () => {
    const params = {
      previous: bsonUrlEncoding.encode([1, 'test']),
      next: bsonUrlEncoding.encode([1, 'test_next']),
    };
    const sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.previous).toEqual([1, 'test']);
    expect(sanitizedParams.next).toEqual([1, 'test_next']);
  });

  it('should set default limit and paginatedField', async () => {
    const params = {};
    const sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.limit).toBe(50);
    expect(sanitizedParams.paginatedField).toBe('_id');
  });

  it('should limit the number of results', async () => {
    const params = { limit: 0 };
    let sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.limit).toBe(1);

    params.limit = 2000;
    sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.limit).toBe(config.MAX_LIMIT);
  });

  it('should handle `after` param', async () => {
    const params = { after: 'some_id' };
    const sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.next).toBe('some_id');
  });

  it('should handle `before` param', async () => {
    const params = { before: 'some_id' };
    const sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.previous).toBe('some_id');
  });

  it('should include paginatedField in query fields', async () => {
    const params = { fields: { name: 1 } };
    const sanitizedParams = await sanitizeParams(collection, params);
    expect(sanitizedParams.fields).toEqual({ _id: 1, name: 1 });
  });

  it('should handle `sortCaseInsensitive` param', async () => {
    const params = {
      paginatedField: 'name',
      sortCaseInsensitive: true,
      before: 'some_id',
    };
    const mockDoc = { _id: 'some_id', name: 'John' };
    (collection.findOne as jest.Mock).mockResolvedValueOnce(mockDoc);

    const paramsWithBefore = {
      ...params,
      before: 'some_id',
    };
    const sanitizedParamsWithBefore = await sanitizeParams(collection, paramsWithBefore);
    expect(sanitizedParamsWithBefore.previous).toEqual(['john', 'some_id']);

    expect(collection.findOne).toHaveBeenCalledWith({ _id: 'some_id' }, { name: true, _id: false });
  });
});
